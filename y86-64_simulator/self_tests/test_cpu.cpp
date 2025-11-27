#include <cassert>
#include <iostream>
#include "../include/global.h"
#include "../include/register.h"
#include "../include/memory.h"
#include "../include/loader.h"
#include "../include/cpu.h"

// =============================================================
// TEST 1: HALT 指令测试
// =============================================================
void test_halt() {
    std::cout << "[TEST] HALT..." << std::endl;

    Memory mem;
    CPU cpu(mem);

    // 写入 HALT 指令：0x00
    mem.writeByte(0, 0x00);

    // 初始状态
    assert(cpu.PC == 0);
    assert(cpu.stat == Stat::AOK);

    // 执行一个周期
    cpu.step();

    // 判断是否正确进入 HLT 状态
    assert(cpu.stat == Stat::HLT);
    assert(cpu.PC == 0);   // HALT PC 不前进

    // 再执行也不应该继续执行程序
    cpu.step();
    assert(cpu.stat == Stat::HLT);
    assert(cpu.PC == 0);

    std::cout << "  PASS" << std::endl;
}



// =============================================================
// TEST 2: NOP 指令测试
// =============================================================
void test_nop() {
    std::cout << "[TEST] NOP..." << std::endl;

    Memory mem;
    CPU cpu(mem);

    // 写入 NOP 指令：0x10
    mem.writeByte(0, 0x10);

    // 初始状态
    assert(cpu.PC == 0);
    assert(cpu.stat == Stat::AOK);

    // 执行一个周期
    cpu.step();

    // NOP 应简单前进 PC
    assert(cpu.PC == 1);
    assert(cpu.stat == Stat::AOK);

    // 寄存器应保持全 0
    for (int i = 0; i < 15; i++) {
        assert(cpu.reg.getReg(static_cast<Reg::ID>(i)) == 0);
    }

    std::cout << "  PASS" << std::endl;
}



// =============================================================
// TEST 3: RRMOVQ 指令测试
// =============================================================
void test_rrmovq() {
    std::cout << "[TEST] RRMOVQ..." << std::endl;

    Memory mem;
    CPU cpu(mem);

    // 写入指令：
    // 0x20 → RRMOVQ (icode=2, ifun=0)
    // 0x01 → rA = 0 (rax), rB = 1 (rcx)
    mem.writeByte(0, 0x20);
    mem.writeByte(1, 0x01);

    // 预置寄存器值：rax = 123, rcx = 0
    cpu.reg.setReg(Reg::RAX, 123);
    cpu.reg.setReg(Reg::RCX, 0);

    // 初始状态检查
    assert(cpu.PC == 0);
    assert(cpu.stat == Stat::AOK);

    // 执行一个周期
    cpu.step();

    // rrmovq: rcx = rax
    assert(cpu.reg.getReg(Reg::RCX) == 123);

    // rax 保持原值
    assert(cpu.reg.getReg(Reg::RAX) == 123);

    // PC 应当前进 2 字节
    assert(cpu.PC == 2);

    // 状态依然正常
    assert(cpu.stat == Stat::AOK);

    // RRMOVQ 不应修改 CC
    assert(cpu.cc.zf == 1);
    assert(cpu.cc.sf == 0);

    std::cout << "  PASS" << std::endl;
}

// =============================================================
// TEST 4: IRMOVQ 指令测试
// =============================================================
void test_irmovq() {
    std::cout << "[TEST] IRMOVQ..." << std::endl;

    Memory mem;
    CPU cpu(mem);

    // 指令编码：
    // 30 F1 1122334455667788
    //
    // 0x30 → IRMOVQ (icode=3, ifun=0)
    // 0xF1 → rA = F (NONE), rB = 1 (RCX)
    // 立即数 = 0x1122334455667788

    mem.writeByte(0, 0x30);     // icode=3, ifun=0
    mem.writeByte(1, 0xF1);     // rA=F, rB=1

    // 写入 valC
    mem.writeByte(2, 0x88);
    mem.writeByte(3, 0x77);
    mem.writeByte(4, 0x66);
    mem.writeByte(5, 0x55);
    mem.writeByte(6, 0x44);
    mem.writeByte(7, 0x33);
    mem.writeByte(8, 0x22);
    mem.writeByte(9, 0x11);

    // 初始状态
    assert(cpu.PC == 0);
    assert(cpu.stat == Stat::AOK);

    // 执行一条指令
    cpu.step();

    // 检查 rB = RCX 是否成功写入 valC
    assert(cpu.reg.getReg(Reg::RCX) == 0x1122334455667788);

    // PC 应该前进 10 个字节（1 + 1 + 8）
    assert(cpu.PC == 10);

    // 状态正常
    assert(cpu.stat == Stat::AOK);

    // IRMOVQ 不修改 CC
    assert(cpu.cc.zf == 1);
    assert(cpu.cc.sf == 0);

    std::cout << "  PASS" << std::endl;
}

// =============================================================
// TEST 5: RMMOVQ 指令测试
// =============================================================
void test_rmmovq() {
    std::cout << "[TEST] RMMOVQ..." << std::endl;

    Memory mem;
    CPU cpu(mem);
    bool err;

    // RMMOVQ rA -> (rB + valC)
    // 40 01 [valC: 8 bytes]
    // rA = RAX (0)
    // rB = RCX (1)

    mem.writeByte(0, 0x40);   // icode=4 RMMOVQ
    mem.writeByte(1, 0x01);   // rA=0 (RAX), rB=1 (RCX)
    mem.writeWord(2, 0x20);   // valC = 0x20 （小端序自动处理）

    // --- 初始化寄存器 ---
    cpu.reg.setReg(Reg::RAX, 0x1122334455667788); // rA 源
    cpu.reg.setReg(Reg::RCX, 0x10);               // rB base

    cpu.step();  // 执行一条指令

    // 目标地址 = RCX + valC = 0x10 + 0x20 = 0x30
    uint64_t addr = 0x10 + 0x20;

    uint64_t memVal = mem.readWord(addr, err);
    assert(!err);
    assert(memVal == 0x1122334455667788);

    // PC 应该加 10 字节
    assert(cpu.PC == 10);

    std::cout << "  PASS" << std::endl;
}

// =============================================================
// TEST 6: MRMOVQ 指令测试
// =============================================================
void test_mrmovq() {
    std::cout << "[TEST] MRMOVQ..." << std::endl;

    Memory mem;
    CPU cpu(mem);
    bool err;

    // MRMOVQ 编码格式：
    // 50 rA rB [valC:8 bytes]
    //
    // 语义：rA ← M[ rB + valC ]

    // ----------------------------------------------------------
    // CASE 1: 基本功能测试（正 offset）
    // ----------------------------------------------------------
    cpu.reset();
    mem.reset();

    mem.writeByte(0, 0x50);   // icode=5, MRMOVQ
    mem.writeByte(1, 0x01);   // rA=0(RAX), rB=1(RCX)
    mem.writeWord(2, 0x20);   // valC = 0x20

    // 设置内存中 M[RCX + 0x20] 的值
    uint64_t addr = 0x10 + 0x20;
    mem.writeWord(addr, 0x1122334455667788ULL);

    // 设置 RCX
    cpu.reg.setReg(Reg::RCX, 0x10);

    cpu.step();

    // 检查寄存器写回
    assert(cpu.reg.getReg(Reg::RAX) == 0x1122334455667788ULL);

    // 检查 PC 是否 +10
    assert(cpu.PC == 10);

    // ----------------------------------------------------------
    // CASE 2: 负数 offset（补码）
    // M[ rB - 0x8 ] → rA
    // ----------------------------------------------------------
    cpu.reset();
    mem.reset();

    mem.writeByte(0, 0x50);
    mem.writeByte(1, 0x01);     // rA=RAX, rB=RCX
    mem.writeWord(2, (uint64_t)-8);   // valC = -8 (0xFFFFFFFFFFFFFFF8)

    // base = 0x40, 目标 = 0x38
    cpu.reg.setReg(Reg::RCX, 0x40);
    mem.writeWord(0x38, 0xAABBCCDDEEFF0011ULL);

    cpu.step();

    assert(cpu.reg.getReg(Reg::RAX) == 0xAABBCCDDEEFF0011ULL);
    assert(cpu.PC == 10);

    // ----------------------------------------------------------
    // CASE 3: 大数值读取（高位数据测试）
    // ----------------------------------------------------------
    cpu.reset();
    mem.reset();

    mem.writeByte(0, 0x50);
    mem.writeByte(1, 0x01);        // rA=RAX, rB=RCX
    mem.writeWord(2, 0x100);       // valC = 0x100

    cpu.reg.setReg(Reg::RCX, 0x200);
    mem.writeWord(0x300, 0xFFFFFFFFFFFFFFFFULL);

    cpu.step();

    assert(cpu.reg.getReg(Reg::RAX) == 0xFFFFFFFFFFFFFFFFULL);
    assert(cpu.PC == 10);

    std::cout << "  PASS" << std::endl;
}

// =============================================================
// TEST 7: OPQ 指令全面测试（ADD/SUB/AND/XOR + CC）
// =============================================================
void test_opq() {
    std::cout << "[TEST] OPQ..." << std::endl;

    Memory mem;
    CPU cpu(mem);
    bool err;

    // ----------------------------------------------------------
    // CASE 1: ADDQ（正常情况）
    // ----------------------------------------------------------
    cpu.reset();
    mem.reset();

    mem.writeByte(0, 0x60);   // OPQ with fn=0 (ADD)
    mem.writeByte(1, 0x01);   // rA=0 (RAX), rB=1 (RCX)

    cpu.reg.setReg(Reg::RAX, 5);
    cpu.reg.setReg(Reg::RCX, 10);

    cpu.step();

    assert(cpu.reg.getReg(Reg::RCX) == 15);
    assert(cpu.cc.of == false);
    assert(cpu.cc.zf == false);
    assert(cpu.cc.sf == false);
    assert(cpu.PC == 2);

    // ----------------------------------------------------------
    // CASE 2: ADDQ 溢出（正 + 正 = 负）
    // ----------------------------------------------------------
    cpu.reset();
    mem.reset();

    mem.writeByte(0, 0x60);   // ADD
    mem.writeByte(1, 0x01);

    cpu.reg.setReg(Reg::RAX, INT64_MAX);
    cpu.reg.setReg(Reg::RCX, 1);

    cpu.step();

    assert(cpu.cc.of == true);     // overflow
    assert(cpu.cc.sf == true);     // result becomes negative
    assert(cpu.cc.zf == false);
    assert(cpu.PC == 2);

    // ----------------------------------------------------------
    // CASE 3: SUBQ（正常情况：10 - 3 = 7）
    // ----------------------------------------------------------
    cpu.reset();
    mem.reset();

    mem.writeByte(0, 0x61);   // SUBQ
    mem.writeByte(1, 0x01);

    cpu.reg.setReg(Reg::RAX, 3);
    cpu.reg.setReg(Reg::RCX, 10);

    cpu.step();

    assert(cpu.reg.getReg(Reg::RCX) == 7);
    assert(cpu.cc.of == false);
    assert(cpu.cc.sf == false);
    assert(cpu.cc.zf == false);
    assert(cpu.PC == 2);

    // ----------------------------------------------------------
    // CASE 4: SUBQ 溢出（正 - 负 = wrap → negative）
    // ----------------------------------------------------------
    cpu.reset();
    mem.reset();

    mem.writeByte(0, 0x61);   // SUBQ
    mem.writeByte(1, 0x01);

    cpu.reg.setReg(Reg::RAX, INT64_MIN);  // a = -2^63
    cpu.reg.setReg(Reg::RCX, 1);          // b = 1

    cpu.step();

    // Correct CC (符合 Y86 / x86 规范)
    assert(cpu.cc.of == true);    // 溢出：正 - 负 得到负
    assert(cpu.cc.sf == true);    // 结果 wrap 后符号位为 1（负）
    assert(cpu.cc.zf == false);
    assert(cpu.PC == 2);

    // ----------------------------------------------------------
    // CASE 5: ANDQ
    // ----------------------------------------------------------
    cpu.reset();
    mem.reset();

    mem.writeByte(0, 0x62);   // AND
    mem.writeByte(1, 0x01);

    cpu.reg.setReg(Reg::RAX, 0b1100);
    cpu.reg.setReg(Reg::RCX, 0b1010);

    cpu.step();

    assert(cpu.reg.getReg(Reg::RCX) == (0b1100 & 0b1010));
    assert(cpu.cc.of == false);
    assert(cpu.cc.sf == false);
    assert(cpu.cc.zf == false);
    assert(cpu.PC == 2);

    // ----------------------------------------------------------
    // CASE 6: XORQ
    // ----------------------------------------------------------
    cpu.reset();
    mem.reset();

    mem.writeByte(0, 0x63);   // XOR
    mem.writeByte(1, 0x01);

    cpu.reg.setReg(Reg::RAX, 0b1100);
    cpu.reg.setReg(Reg::RCX, 0b1010);

    cpu.step();

    assert(cpu.reg.getReg(Reg::RCX) == (0b1100 ^ 0b1010));
    assert(cpu.cc.of == false);
    assert(cpu.cc.sf == false);
    assert(cpu.cc.zf == false);
    assert(cpu.PC == 2);

    // ----------------------------------------------------------
    // CASE 7: XORQ → ZF = 1（结果为 0）
    // ----------------------------------------------------------
    cpu.reset();
    mem.reset();

    mem.writeByte(0, 0x63);   // XOR
    mem.writeByte(1, 0x00);   // rA=rB=RAX

    cpu.reg.setReg(Reg::RAX, 0x1234);

    cpu.step();

    assert(cpu.reg.getReg(Reg::RAX) == 0);
    assert(cpu.cc.zf == true);
    assert(cpu.cc.sf == false);
    assert(cpu.cc.of == false);
    assert(cpu.PC == 2);

    // ----------------------------------------------------------
    // CASE 8: ADDQ → SF = 1（负数结果）
    // ----------------------------------------------------------
    cpu.reset();
    mem.reset();

    mem.writeByte(0, 0x60);   // ADD
    mem.writeByte(1, 0x01);

    cpu.reg.setReg(Reg::RAX, -5);
    cpu.reg.setReg(Reg::RCX, 0);

    cpu.step();

    assert(cpu.cc.sf == true);
    assert(cpu.cc.zf == false);
    assert(cpu.cc.of == false);
    assert(cpu.PC == 2);

    std::cout << "  PASS" << std::endl;
}

// =============================================================
// TEST 8: CMOVXX 指令测试（CMOVLE / CMOVL / CMOVE / CMOVNE / CMOVGE / CMOVG）
// =============================================================
void test_cmovXX() {
    std::cout << "[TEST] CMOVXX..." << std::endl;

    Memory mem;
    CPU cpu(mem);
    bool err;

    // CMOVXX 编码：
    // 20 fn rA rB
    // fn = condition function code 0 ~ 6
    // rA = source
    // rB = destination

    // ==========================================================
    // Helper lambda: 执行一条 CMOVXX
    // ==========================================================
    auto run_cmov = [&](int fn, bool zf, bool sf, bool of,
                        uint64_t srcVal, uint64_t dstVal_before,
                        bool shouldMove) 
    {
        cpu.reset();
        mem.reset();

        // 指令编码：20 fn rA rB
        mem.writeByte(0, (0x2 << 4) | fn);   // 正确写 ifunc
        mem.writeByte(1, (0 << 4) | 0x1);    // rA=RAX, rB=RCX

        // 手动设置 cc
        cpu.cc.zf = zf;
        cpu.cc.sf = sf;
        cpu.cc.of = of;

        // 设置寄存器
        cpu.reg.setReg(Reg::RAX, srcVal);
        cpu.reg.setReg(Reg::RCX, dstVal_before);

        cpu.step();

        uint64_t dstVal_after = cpu.reg.getReg(Reg::RCX);

        if (shouldMove)
            assert(dstVal_after == srcVal);
        else
            assert(dstVal_after == dstVal_before);

        assert(cpu.PC == 2);
    };

    // ==========================================================
    // 定义所有条件判断：我们只需要看 cc，不需要 OPQ
    // ==========================================================

    // case groups:
    // 1) zf=1 → equal
    // 2) (sf != of) → less
    // 3) !(sf != of) && !zf → greater
    // 4) !(sf != of) → >=
    // ==========================================================

    uint64_t A = 0xAAA, B = 0xBBB;

    // ------------- RRMOVQ（always move） fn=0 -------------
    run_cmov(0, 0,0,0,  A,B, true);
    run_cmov(0, 1,1,0,  A,B, true);

    // ==========================================================
    // CMOVLE: <= : (sf != of) || zf
    // ==========================================================
    // <= true (ZF=1)
    run_cmov(1, 1,0,0, A,B, true);

    // <= true (SF!=OF)
    run_cmov(1, 0,1,0, A,B, true);

    // <= false
    run_cmov(1, 0,0,0, A,B, false);

    // ==========================================================
    // CMOVL: < : (sf != of)
    // ==========================================================
    // < true
    run_cmov(2, 0,1,0, A,B, true);

    // < false
    run_cmov(2, 0,0,0, A,B, false);

    // < false even if ZF=1
    run_cmov(2, 1,0,0, A,B, false);

    // ==========================================================
    // CMOVE: == : ZF
    // ==========================================================
    // == true
    run_cmov(3, 1,0,0, A,B, true);

    // == false
    run_cmov(3, 0,0,0, A,B, false);

    // ==========================================================
    // CMOVNE: != : !ZF
    // ==========================================================
    // != true
    run_cmov(4, 0,0,0, A,B, true);

    // != false
    run_cmov(4, 1,0,0, A,B, false);

    // ==========================================================
    // CMOVGE: >= : !(sf != of)
    // ==========================================================
    // >= true: sf==of
    run_cmov(5, 0,0,0, A,B, true);
    run_cmov(5, 0,1,1, A,B, true);

    // >= false: sf!=of
    run_cmov(5, 0,1,0, A,B, false);

    // ==========================================================
    // CMOVG: > : !(sf != of) && !zf
    // ==========================================================
    // > true: sf==of && zf=0
    run_cmov(6, 0,0,0, A,B, true);
    run_cmov(6, 0,1,1, A,B, true);

    // > false: equal
    run_cmov(6, 1,0,0, A,B, false);

    // > false: less
    run_cmov(6, 0,1,0, A,B, false);

    std::cout << "  PASS" << std::endl;
}

// =============================================================
// TEST 9: PUSHQ & POPQ 指令测试
// =============================================================
void test_push_pop() {
    std::cout << "[TEST] PUSHQ & POPQ..." << std::endl;

    Memory mem;
    CPU cpu(mem);
    bool err;

    // ----------------------------------------------------------
    // CASE 1: PUSHQ 基本功能
    // ----------------------------------------------------------
    cpu.reset();
    mem.reset();

    // 指令: pushq %rax
    // 编码: 0xA0 rA F   (rB=F)
    mem.writeByte(0, 0xA0);        // icode=0xA pushq
    mem.writeByte(1, 0x0F);        // rA=0(RAX), rB=F (unused)

    cpu.reg.setReg(Reg::RAX, 0x1122334455667788ULL);
    cpu.reg.setReg(Reg::RSP, 0x100);

    cpu.step();

    // 验证 RSP
    assert(cpu.reg.getReg(Reg::RSP) == 0x100 - 8);

    // 验证 内存
    uint64_t val = mem.readWord(0x100 - 8, err);
    assert(!err);
    assert(val == 0x1122334455667788ULL);

    // 验证 PC
    assert(cpu.PC == 2);

    // ----------------------------------------------------------
    // CASE 2: POPQ 基本功能
    // (在 CASE1 的基础上继续测试)
    // ----------------------------------------------------------
    cpu.reset();
    mem.reset();

    // 先手动铺好内存与 RSP
    mem.writeWord(0x200, 0xAABBCCDDEEFF0011ULL);  // 内存中放一个值
    cpu.reg.setReg(Reg::RSP, 0x200);
    cpu.reg.setReg(Reg::RAX, 0x1234);             // 等下会被 POP 覆盖掉

    // popq %rax
    mem.writeByte(0, 0xB0);     // icode=POPQ (0xB)
    mem.writeByte(1, 0x0F);     // rA=0(RAX), rB=F

    cpu.step();

    // 验证 RAX 是否正确取到内存值
    assert(cpu.reg.getReg(Reg::RAX) == 0xAABBCCDDEEFF0011ULL);

    // 验证 RSP 是否加 8
    assert(cpu.reg.getReg(Reg::RSP) == 0x200 + 8);

    // 验证 PC
    assert(cpu.PC == 2);

    // ----------------------------------------------------------
    // CASE 3: PUSH -> POP 连续一致性（标准栈操作）
    // ----------------------------------------------------------
    cpu.reset();
    mem.reset();

    // pushq %rax
    mem.writeByte(0, 0xA0);
    mem.writeByte(1, 0x0F);

    // popq %rbx
    mem.writeByte(2, 0xB0);
    mem.writeByte(3, 0x3F);     // rA = 3(RBX)

    cpu.reg.setReg(Reg::RAX, 0x123456789ABCDEF0ULL);
    cpu.reg.setReg(Reg::RSP, 0x300);

    cpu.step();  // 执行 push
    cpu.step();  // 执行 pop

    // 栈恢复
    assert(cpu.reg.getReg(Reg::RSP) == 0x300);

    // popq 的结果
    assert(cpu.reg.getReg(Reg::RBX) == 0x123456789ABCDEF0ULL);

    // 验证 PC
    assert(cpu.PC == 4);

    std::cout << "  PASS" << std::endl;
}

// =============================================================
// TEST 10: JXX 指令测试（JMP / JLE / JL / JE / JNE / JGE / JG）
// =============================================================
void test_jxx() {
    std::cout << "[TEST] JXX..." << std::endl;

    Memory mem;
    CPU cpu(mem);

    auto run_jxx = [&](int ifun, bool zf, bool sf, bool of,
                       bool shouldJump)
    {
        cpu.reset();
        mem.reset();

        // 指令：70+ifun  (JXX)
        // 编码格式：
        //   70 fn   [8-byte valC]
        //
        // 跳转目标 = 0x1122334455667788

        mem.writeByte(0, (0x7 << 4) | ifun);
        mem.writeWord(1, 0x1122334455667788ULL);

        // 设置 CC
        cpu.cc.zf = zf;
        cpu.cc.sf = sf;
        cpu.cc.of = of;

        // 执行
        cpu.step();

        if (shouldJump) {
            assert(cpu.PC == 0x1122334455667788ULL);
        } else {
            assert(cpu.PC == 1 + 8);   // valP 正常前进 9 字节
        }
    };

    // helper labels
    const uint64_t A = 0x1122334455667788ULL;

    // ==========================================================
    // JMP (ifun = 0) 无条件跳转
    // ==========================================================
    run_jxx(0, 0,0,0, true);
    run_jxx(0, 1,1,1, true);

    // ==========================================================
    // JLE: <=  (ZF == 1) or (SF != OF)
    // ==========================================================
    // <= true cases
    run_jxx(1, 1,0,0, true);   // equal
    run_jxx(1, 0,1,0, true);   // less

    // <= false
    run_jxx(1, 0,0,0, false);

    // ==========================================================
    // JL: <  (SF != OF)
    // ==========================================================
    run_jxx(2, 0,1,0, true);
    run_jxx(2, 1,1,0, true);   // zf irrelevant if less

    // false cases
    run_jxx(2, 1,0,0, false);  // equal but not less
    run_jxx(2, 0,0,0, false);

    // ==========================================================
    // JE: ==  (ZF == 1)
    // ==========================================================
    run_jxx(3, 1,0,0, true);
    run_jxx(3, 1,1,1, true);

    run_jxx(3, 0,0,0, false);

    // ==========================================================
    // JNE: != (ZF == 0)
    // ==========================================================
    run_jxx(4, 0,0,0, true);
    run_jxx(4, 0,1,1, true);

    run_jxx(4, 1,0,0, false);

    // ==========================================================
    // JGE: >= (SF == OF)
    // ==========================================================
    run_jxx(5, 0,0,0, true);
    run_jxx(5, 0,1,1, true);

    run_jxx(5, 0,1,0, false); // less

    // ==========================================================
    // JG: > : (SF == OF) && (ZF == 0)
    // ==========================================================
    run_jxx(6, 0,0,0, true);   // greater
    run_jxx(6, 0,1,1, true);   // greater

    run_jxx(6, 1,0,0, false);  // equal
    run_jxx(6, 0,1,0, false);  // less

    std::cout << "  PASS" << std::endl;
}

// =============================================================
// TEST 11: CALL 指令测试（CALL 单独功能）
// =============================================================
void test_call() {
    std::cout << "[TEST] CALL..." << std::endl;

    Memory mem;
    CPU cpu(mem);
    bool err;

    // ----------------------------------------------------------
    // CASE 1: 基本 CALL 功能：push return_address + 跳转 valC
    // ----------------------------------------------------------
    cpu.reset();
    mem.reset();

    // 指令格式：
    //   80 [valC:8 bytes]
    //
    // 0x80: CALL
    // valC = 0x300
    //
    // 机器码：
    //   0: 80
    //   1~8: 00 03 00 00 00 00 00 00  (0x300 小端序)

    mem.writeByte(0, 0x80);       // CALL
    mem.writeWord(1, 0x300);      // valC = 0x300

    // 设定当前 RSP = 0x100
    cpu.reg.setReg(Reg::RSP, 0x100);

    // 执行 CALL
    cpu.step();

    // RETURN ADDRESS = valP = PC+9 = 9
    // CALL 会 push return_address 到 RSP-8
    //
    // 栈顶新地址 = 0x100 - 8 = 0xF8

    assert(cpu.reg.getReg(Reg::RSP) == 0x100 - 8);

    uint64_t retAddr = mem.readWord(0xF8, err);
    assert(!err);
    assert(retAddr == 9);     // 下一条指令地址

    // PC 应跳转到 valC = 0x300
    assert(cpu.PC == 0x300);

    // CALL 不影响条件码
    assert(cpu.cc.zf == true);
    assert(cpu.cc.sf == false);
    assert(cpu.cc.of == false);

    // ----------------------------------------------------------
    // CASE 2: 多次 CALL 叠加（栈是否连续正确 push）
    // ----------------------------------------------------------
    cpu.reset();
    mem.reset();

    // 写 2 个连续 CALL
    // CALL 0x50   (9 字节)
    // CALL 0xA0   (9 字节)
    //
    // Layout:
    //   0: 80
    //   1~8:   50 00 00 00 00 00 00 00
    //   9: 80
    //   10~17: A0 00 00 00 00 00 00 00

    mem.writeByte(0, 0x80);
    mem.writeWord(1, 0x50);
    mem.writeByte(9, 0x80);
    mem.writeWord(10, 0xA0);

    cpu.reg.setReg(Reg::RSP, 0x200);

    // 执行第一次 CALL
    cpu.step();
    assert(cpu.reg.getReg(Reg::RSP) == 0x200 - 8);
    assert(mem.readWord(0x1F8, err) == 9); // 下一条 PC = 9
    assert(cpu.PC == 0x50);

    // 返回到 0 再执行第二次（模拟 PC=9）
    cpu.PC = 9;

    cpu.step();
    assert(cpu.reg.getReg(Reg::RSP) == 0x200 - 16);
    assert(mem.readWord(0x1F0, err) == 18);  // 第二条的 return address = 18
    assert(cpu.PC == 0xA0);

    std::cout << "  PASS" << std::endl;
}

// =============================================================
// TEST 12: RET 指令测试（RET 单独功能）
// =============================================================
void test_ret() {
    std::cout << "[TEST] RET..." << std::endl;

    Memory mem;
    CPU cpu(mem);
    bool err;

    // ----------------------------------------------------------
    // CASE 1: 基本 RET 功能
    // ----------------------------------------------------------
    cpu.reset();
    mem.reset();

    // 写入指令：
    //   0x90 → RET
    mem.writeByte(0, 0x90);

    // 设置 RSP=0x200
    cpu.reg.setReg(Reg::RSP, 0x200);

    // 预先在内存 M[0x200] 写入返回地址 0x350
    mem.writeWord(0x200, 0x350ULL);

    // 执行 RET
    cpu.step();

    // (1) RSP 应加 8
    assert(cpu.reg.getReg(Reg::RSP) == 0x200 + 8);

    // (2) PC 应跳转到内存读取的返回地址 0x350
    assert(cpu.PC == 0x350);

    // (3) RET 不修改 CC
    assert(cpu.cc.zf == true);
    assert(cpu.cc.sf == false);
    assert(cpu.cc.of == false);

    // ----------------------------------------------------------
    // CASE 2: RET 支持高位返回地址
    // ----------------------------------------------------------
    cpu.reset();
    mem.reset();

    mem.writeByte(0, 0x90);  // RET

    // RSP = 0x500
    cpu.reg.setReg(Reg::RSP, 0x500);

    // 返回地址 = 超大值（64bit max）
    mem.writeWord(0x500, 0xFFFFFFFFFFFFFFFFULL);

    cpu.step();

    assert(cpu.reg.getReg(Reg::RSP) == 0x500 + 8);
    assert(cpu.PC == 0xFFFFFFFFFFFFFFFFULL);

    // CC unchanged
    assert(cpu.cc.zf == true);
    assert(cpu.cc.sf == false);
    assert(cpu.cc.of == false);

    // ----------------------------------------------------------
    // CASE 3: RET 不应修改通用寄存器（除了 RSP）
    // ----------------------------------------------------------
    cpu.reset();
    mem.reset();

    mem.writeByte(0, 0x90);    // RET

    cpu.reg.setReg(Reg::RSP, 0x100);
    cpu.reg.setReg(Reg::RAX, 0x123456789ABCDEF0ULL);
    mem.writeWord(0x100, 0x20);

    cpu.step();

    assert(cpu.PC == 0x20);
    assert(cpu.reg.getReg(Reg::RSP) == 0x108);
    assert(cpu.reg.getReg(Reg::RAX) == 0x123456789ABCDEF0ULL); // unchanged

    std::cout << "  PASS" << std::endl;
}

// =============================================================
// TEST 14: CALL + RET 联合测试（完整函数调用流程）
// =============================================================
void test_call_ret() {
    std::cout << "[TEST] CALL + RET (联合测试) ..." << std::endl;

    Memory mem;
    CPU cpu(mem);
    bool err;

    cpu.reset();
    mem.reset();

    // ----------------------------------------------------------
    // 程序布局：
    //
    // 0:   80 [00 00 00 00 00 00 00 64]   ; call 0x64
    // 9:   00                             ; halt
    //
    // 100(0x64): 90                       ; ret
    // ----------------------------------------------------------

    // CALL 0x64
    mem.writeByte(0, 0x80);
    mem.writeWord(1, 0x64ULL);

    // HALT
    mem.writeByte(9, 0x00);

    // RET at 0x64
    mem.writeByte(0x64, 0x90);

    // 初始 RSP
    cpu.reg.setReg(Reg::RSP, 0x200);

    // ----------------------------------------------------------
    // STEP 1: 执行 CALL
    // ----------------------------------------------------------
    cpu.step();

    // RSP = 0x200 - 8 = 0x1F8
    assert(cpu.reg.getReg(Reg::RSP) == 0x200 - 8);

    // 栈顶应写入 return address = 9
    assert(mem.readWord(0x1F8, err) == 9);

    // PC 应跳到 0x64
    assert(cpu.PC == 0x64);

    // ----------------------------------------------------------
    // STEP 2: 执行 RET
    // ----------------------------------------------------------
    cpu.step();

    // RSP 应恢复为 0x200
    assert(cpu.reg.getReg(Reg::RSP) == 0x200);

    // PC 应恢复为 return address = 9
    assert(cpu.PC == 9);

    // ----------------------------------------------------------
    // STEP 3: 执行 HALT
    // ----------------------------------------------------------
    cpu.step();
    assert(cpu.stat == Stat::HLT);

    std::cout << "  PASS" << std::endl;
}


// =============================================================
// MAIN: 运行所有测试
// =============================================================
int main() {
    test_halt();
    test_nop();
    test_rrmovq();
    test_irmovq();
    test_rmmovq();
    test_mrmovq();
    test_opq();
    test_cmovXX();
    test_push_pop();
    test_jxx();
    test_call();
    test_ret();
    test_call_ret();  // call & ret 联合测试

    std::cout << "==========================" << std::endl;
    std::cout << "All CPU tests passed!" << std::endl;

    return 0;
}
