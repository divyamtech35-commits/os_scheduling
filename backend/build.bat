@echo off
echo Building the C++ Server with g++...
g++ -O3 main.cpp -o server.exe -static -static-libgcc -static-libstdc++ -lws2_32
if errorlevel 1 (
    echo Compilation with g++ failed. Trying with cl MSVC...
    cl /EHsc /O2 main.cpp /Fe"server.exe" ws2_32.lib
    if errorlevel 1 (
        echo Compilation failed. Please ensure you have g++ or MSVC installed and added to PATH.
        pause
        exit /b 1
    )
)
echo Build successful! Run server.exe to start the backend.
pause
