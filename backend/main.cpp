#include "httplib.h"
#include "nlohmann/json.hpp"
#include <vector>
#include <string>
#include <algorithm>
#include <queue>
#include <iostream>

using namespace std;
using json = nlohmann::json;

struct Process {
    string id;
    int arrival;
    int burst;
    int remainingBurst;
    
    int completion = 0;
    int turnaround = 0;
    int waiting = 0;
};

struct GanttBlock {
    string processId;
    int start;
    int end;
};

bool sortByArrival(const Process& a, const Process& b) {
    if(a.arrival == b.arrival) return a.id < b.id;
    return a.arrival < b.arrival;
}

json calculateResults(vector<Process>& processes, vector<GanttBlock>& gantt, int totalTime, int totalIdleTime) {
    json result;
    double totalWaiting = 0;
    double totalTurnaround = 0;
    
    json resultList = json::array();
    for (const auto& p : processes) {
        totalWaiting += p.waiting;
        totalTurnaround += p.turnaround;
        
        json pJson;
        pJson["id"] = p.id;
        pJson["arrival"] = p.arrival;
        pJson["burst"] = p.burst;
        pJson["completion"] = p.completion;
        pJson["turnaround"] = p.turnaround;
        pJson["waiting"] = p.waiting;
        
        resultList.push_back(pJson);
    }
    
    json ganttList = json::array();
    for (const auto& g : gantt) {
        json gJson;
        gJson["process"] = g.processId;
        gJson["start"] = g.start;
        gJson["end"] = g.end;
        ganttList.push_back(gJson);
    }
    
    int n = processes.size();
    
    result["results"] = resultList;
    result["gantt"] = ganttList;
    
    json averages;
    averages["waiting"] = n > 0 ? totalWaiting / n : 0;
    averages["turnaround"] = n > 0 ? totalTurnaround / n : 0;
    
    double cpuUtilization = 0;
    if (totalTime > 0) {
        cpuUtilization = ((double)(totalTime - totalIdleTime) / totalTime) * 100.0;
    }
    averages["cpuUtilization"] = cpuUtilization;
    
    result["averages"] = averages;
    return result;
}

void mergeGanttBlocks(vector<GanttBlock>& gantt) {
    if (gantt.empty()) return;
    vector<GanttBlock> merged;
    merged.push_back(gantt[0]);
    for (size_t i = 1; i < gantt.size(); ++i) {
        if (merged.back().processId == gantt[i].processId && merged.back().end == gantt[i].start) {
            merged.back().end = gantt[i].end;
        } else {
            merged.push_back(gantt[i]);
        }
    }
    gantt = merged;
}

json executeFCFS(vector<Process> processes) {
    sort(processes.begin(), processes.end(), sortByArrival);
    vector<GanttBlock> gantt;
    int currentTime = 0;
    int totalIdleTime = 0;
    
    for (auto& p : processes) {
        if (currentTime < p.arrival) {
            gantt.push_back({"Idle", currentTime, p.arrival});
            totalIdleTime += (p.arrival - currentTime);
            currentTime = p.arrival;
        }
        
        gantt.push_back({p.id, currentTime, currentTime + p.burst});
        currentTime += p.burst;
        
        p.completion = currentTime;
        p.turnaround = p.completion - p.arrival;
        p.waiting = p.turnaround - p.burst;
    }
    mergeGanttBlocks(gantt);
    return calculateResults(processes, gantt, currentTime, totalIdleTime);
}

json executeSJF(vector<Process> processes) {
    sort(processes.begin(), processes.end(), sortByArrival);
    vector<GanttBlock> gantt;
    int currentTime = 0;
    int totalIdleTime = 0;
    int completed = 0;
    int n = processes.size();
    
    vector<bool> isCompleted(n, false);
    
    while (completed != n) {
        int idx = -1;
        int minBurst = 1e9;
        
        for (int i = 0; i < n; i++) {
            if (processes[i].arrival <= currentTime && !isCompleted[i]) {
                if (processes[i].burst < minBurst) {
                    minBurst = processes[i].burst;
                    idx = i;
                }
                else if (processes[i].burst == minBurst) {
                    if (processes[i].arrival < processes[idx].arrival) {
                        idx = i;
                    }
                }
            }
        }
        
        if (idx != -1) {
            gantt.push_back({processes[idx].id, currentTime, currentTime + processes[idx].burst});
            currentTime += processes[idx].burst;
            processes[idx].completion = currentTime;
            processes[idx].turnaround = processes[idx].completion - processes[idx].arrival;
            processes[idx].waiting = processes[idx].turnaround - processes[idx].burst;
            isCompleted[idx] = true;
            completed++;
        } else {
            gantt.push_back({"Idle", currentTime, currentTime + 1});
            currentTime++;
            totalIdleTime++;
        }
    }
    mergeGanttBlocks(gantt);
    return calculateResults(processes, gantt, currentTime, totalIdleTime);
}

json executeSRTN(vector<Process> processes) {
    sort(processes.begin(), processes.end(), sortByArrival);
    vector<GanttBlock> gantt;
    int currentTime = 0;
    int totalIdleTime = 0;
    int completed = 0;
    int n = processes.size();
    
    while (completed != n) {
        int idx = -1;
        int minRemaining = 1e9;
        
        for (int i = 0; i < n; i++) {
            if (processes[i].arrival <= currentTime && processes[i].remainingBurst > 0) {
                if (processes[i].remainingBurst < minRemaining) {
                    minRemaining = processes[i].remainingBurst;
                    idx = i;
                } else if (processes[i].remainingBurst == minRemaining) {
                    if (processes[i].arrival < processes[idx].arrival) {
                        idx = i;
                    }
                }
            }
        }
        
        if (idx != -1) {
            gantt.push_back({processes[idx].id, currentTime, currentTime + 1});
            processes[idx].remainingBurst--;
            currentTime++;
            
            if (processes[idx].remainingBurst == 0) {
                processes[idx].completion = currentTime;
                processes[idx].turnaround = processes[idx].completion - processes[idx].arrival;
                processes[idx].waiting = processes[idx].turnaround - processes[idx].burst;
                completed++;
            }
        } else {
            gantt.push_back({"Idle", currentTime, currentTime + 1});
            currentTime++;
            totalIdleTime++;
        }
    }
    mergeGanttBlocks(gantt);
    return calculateResults(processes, gantt, currentTime, totalIdleTime);
}

json executeRR(vector<Process> processes, int timeQuantum) {
    sort(processes.begin(), processes.end(), sortByArrival);
    vector<GanttBlock> gantt;
    int currentTime = 0;
    int totalIdleTime = 0;
    int completed = 0;
    int n = processes.size();
    
    queue<int> q;
    vector<bool> inQueue(n, false);
    
    int currentIdx = 0;
    
    if (n > 0 && processes[0].arrival == 0) {
        q.push(0);
        inQueue[0] = true;
        currentIdx = 1;
    }
    
    while (completed != n) {
        if (q.empty() && currentIdx < n) {
            int nextArrival = processes[currentIdx].arrival;
            gantt.push_back({"Idle", currentTime, nextArrival});
            totalIdleTime += (nextArrival - currentTime);
            currentTime = nextArrival;
            q.push(currentIdx);
            inQueue[currentIdx] = true;
            currentIdx++;
        }
        
        if (q.empty()) break;
        
        int idx = q.front();
        q.pop();
        inQueue[idx] = false;
        
        int executeTime = min(processes[idx].remainingBurst, timeQuantum);
        gantt.push_back({processes[idx].id, currentTime, currentTime + executeTime});
        processes[idx].remainingBurst -= executeTime;
        currentTime += executeTime;
        
        while (currentIdx < n && processes[currentIdx].arrival <= currentTime) {
            if (!inQueue[currentIdx] && processes[currentIdx].remainingBurst > 0) {
                q.push(currentIdx);
                inQueue[currentIdx] = true;
            }
            currentIdx++;
        }
        
        if (processes[idx].remainingBurst > 0) {
            q.push(idx);
            inQueue[idx] = true;
        } else {
            processes[idx].completion = currentTime;
            processes[idx].turnaround = processes[idx].completion - processes[idx].arrival;
            processes[idx].waiting = processes[idx].turnaround - processes[idx].burst;
            completed++;
        }
    }
    mergeGanttBlocks(gantt);
    return calculateResults(processes, gantt, currentTime, totalIdleTime);
}

void setCorsHeaders(httplib::Response &res) {
    res.set_header("Access-Control-Allow-Origin", "*");
    res.set_header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type");
}

int main() {
    httplib::Server svr;

    svr.Options("/api/schedule", [](const httplib::Request&, httplib::Response& res) {
        setCorsHeaders(res);
        res.status = 204;
    });

    svr.Post("/api/schedule", [](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            auto x = json::parse(req.body);
            string algorithm = x["algorithm"];
            int timeQuantum = 2;
            if (x.contains("timeQuantum")) {
                timeQuantum = x["timeQuantum"];
            }
            
            vector<Process> processes;
            for (const auto& p : x["processes"]) {
                Process proc;
                proc.id = p["id"];
                proc.arrival = p["arrival"];
                proc.burst = p["burst"];
                proc.remainingBurst = proc.burst;
                processes.push_back(proc);
            }
            
            json result;
            if (algorithm == "FCFS") {
                result = executeFCFS(processes);
            } else if (algorithm == "SJF") {
                result = executeSJF(processes);
            } else if (algorithm == "SRTN") {
                result = executeSRTN(processes);
            } else if (algorithm == "Round Robin") {
                result = executeRR(processes, timeQuantum);
            } else {
                res.status = 400;
                res.set_content("Unknown Algorithm", "text/plain");
                return;
            }
            
            res.set_content(result.dump(), "application/json");
        } catch (const std::exception& e) {
            res.status = 400;
            res.set_content("Invalid JSON or Input", "text/plain");
        }
    });

    cout << "Starting CPU Scheduling Server on port 8080..." << endl;
    svr.listen("0.0.0.0", 8080);
}
