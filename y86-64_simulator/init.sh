# g++ -g -O0 -std=c++17 self_tests/test_register.cpp src/register.cpp -Iinclude -o test_register
# ./test_register

# g++ -g -O0 -std=c++17 self_tests/test_memory.cpp src/memory.cpp -Iinclude -o test_memory
# ./test_memory

# g++ -g -O0 -std=c++17 self_tests/test_loader.cpp src/memory.cpp src/loader.cpp -Iinclude -o test_loader
# ./test_loader

# g++ -g -O0 -std=c++17 self_tests/test_cpu.cpp src/register.cpp src/memory.cpp src/loader.cpp src/cpu.cpp -Iinclude -o test_cpu
# ./test_cpu

# g++ -g -O0 -std=c++17 src/main.cpp src/register.cpp src/memory.cpp src/loader.cpp src/cpu.cpp -Iinclude -o y86-64_simulator
# mkdir -p temp_answer
# ./y86-64_simulator < test/prog1.yo > temp_answer/prog1.json
# diff answer/prog1.json temp_answer/prog1.json