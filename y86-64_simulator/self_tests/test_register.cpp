// tests/test_Register.cpp
#include <iostream>
#include <cassert>
#include "../include/register.h"

void test_reset() {
    std::cout << "[TEST] Register reset\n";
    Register Reg;
    Reg.reset();

    for (auto v : Reg.getAll()) assert(v == 0);

    std::cout << "  PASS: reset\n";
}

void test_all_Registers() {
    std::cout << "[TEST] set/get for all Registers\n";
    Register Reg;

    for (int id = 0; id <= Reg::R14; id++) {
        word_t v = id * 123456;
        Reg.setReg((Reg::ID)id, v);
        assert(Reg.getReg((Reg::ID)id) == v);
    }

    std::cout << "  PASS: full Register set/get\n";
}

void test_none_Register() {
    std::cout << "[TEST] NONE Register behavior\n";
    Register Reg;

    Reg.setReg(Reg::NONE, 9999);  // should be ignored
    assert(Reg.getReg(Reg::NONE) == 0);

    std::cout << "  PASS: NONE Register ignored\n";
}

void test_illegal_id() {
    std::cout << "[TEST] illegal ID behavior\n";
    Register Reg;

    // 1. NONE ID（15）必须被忽略
    Reg.setReg(Reg::NONE, 999);
    assert(Reg.getReg(Reg::NONE) == 0);

    // 2. （可选）静态断言：寄存器数量是 16
    static_assert(Reg::R14 == 14, "R14 must equal 14");
    static_assert(Reg::NONE == 15, "NONE must equal 15");

    std::cout << "  PASS: illegal ID handled correctly (NONE only)\n";
}


void test_overwrite() {
    std::cout << "[TEST] overwrite\n";
    Register Reg;

    Reg.setReg(Reg::RAX, 111);
    Reg.setReg(Reg::RAX, 222);
    assert(Reg.getReg(Reg::RAX) == 222);

    std::cout << "  PASS: overwrite\n";
}

int main() {
    std::cout << '\n';
    test_reset();
    test_all_Registers();
    test_none_Register();
    test_illegal_id();
    test_overwrite();
    std::cout << "\n=== Register Tests All Passed ===\n";
}
