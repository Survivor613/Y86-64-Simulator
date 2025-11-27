#include <iostream>
#include <vector>
#include <string>
#include <iterator>
#include "../include/global.h"
#include "../include/register.h"
#include "../include/memory.h"
#include "../include/loader.h"
#include "../include/cpu.h"

void printStateJSON(const CPU& cpu, int steps) {
    if (steps != 1) {
        std::cout << "," << std::endl;
    }

    std::cout << "  {" << std::endl;
    std::cout << "    \"PC\": " << cpu.PC << "," << std::endl;
    std::cout << "    \"STAT\": " << (int)cpu.stat << "," << std::endl;
    
    std::cout << "    \"REG\": {";
    const char* regNames[] = {"rax", "rcx", "rdx", "rbx", "rsp", "rbp", "rsi", "rdi", 
                              "r8", "r9", "r10", "r11", "r12", "r13", "r14", "none"};
    for (int i = 0; i < 15; i++) { 
        std::cout << "\"" << regNames[i] << "\": " << cpu.reg.getReg(static_cast<Reg::ID>(i));
        if (i < 14) std::cout << ", ";
    }
    std::cout << "}," << std::endl;

    std::cout << "    \"CC\": {"
              << "\"ZF\": " << (cpu.cc.zf ? 1 : 0) << ", "
              << "\"SF\": " << (cpu.cc.sf ? 1 : 0) << ", "
              << "\"OF\": " << (cpu.cc.of ? 1 : 0)
              << "}," << std::endl;

    std::cout << "    \"MEM\": {";
    bool firstMem = true;
    for (int i = 0; i < Memory::MAX_SIZE; i += 8) {
        bool error;
        word_t val = cpu.mem.readWord(i, error);
        if (!error && val != 0) {
            if (!firstMem) std::cout << ", ";
            std::cout << "\"" << i << "\": " << val;
            firstMem = false;
        }
    }
    std::cout << "}" << std::endl;

    std::cout << "  }";
}

int main() {
    std::cin >> std::noskipws;
    std::string content((std::istreambuf_iterator<char>(std::cin)), 
                         std::istreambuf_iterator<char>());

    Memory mem;
    CPU cpu(mem);

    if (!Loader::load(content, mem)) {
        std::cout << "[]" << std::endl; 
        return 0;
    }

    std::cout << "[" << std::endl;

    int steps = 0;
    while (cpu.stat == Stat::AOK && steps < 10000) {
        cpu.step();
        steps++;
        printStateJSON(cpu, steps);
    }

    std::cout << "\n]" << std::endl;
    return 0;
}