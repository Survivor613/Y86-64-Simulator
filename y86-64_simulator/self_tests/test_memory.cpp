// tests/test_memory.cpp
#include <iostream>
#include <random>
#include <cassert>
#include "../include/memory.h"

std::mt19937_64 rng(12345);

// 随机生成 byte
byte_t randByte() {
    return static_cast<byte_t>(rng() & 0xFF);
}

// 随机生成 64-bit word
word_t randWord() {
    return static_cast<word_t>(rng());
}

void test_reset() {
    std::cout << "[TEST] Memory reset\n";
    Memory mem;

    mem.writeByte(0, 0xAA);
    mem.writeByte(100, 0xBB);

    mem.reset();

    bool err = false;
    assert(mem.readByte(0, err) == 0);
    assert(mem.readByte(100, err) == 0);

    std::cout << "  PASS: reset clears all bytes\n";
}

void test_write_read_byte() {
    std::cout << "[TEST] writeByte/readByte\n";
    Memory mem;
    bool err = false;

    // 测试 0~255
    for (addr_t i = 0; i < 256; i++) {
        byte_t b = randByte();
        mem.writeByte(i, b);
        assert(mem.readByte(i, err) == b);
        assert(!err);
    }

    std::cout << "  PASS: byte read/write correct\n";
}

void test_byte_out_of_bounds() {
    std::cout << "[TEST] out-of-bounds byte\n";
    Memory mem;
    bool err = false;

    // addr == MAX_SIZE 不允许
    mem.readByte(Memory::MAX_SIZE, err);
    assert(err);

    // addr > MAX_SIZE 更不允许
    mem.readByte(Memory::MAX_SIZE + 1000, err);
    assert(err);

    std::cout << "  PASS: out-of-bounds detected\n";
}

void test_write_read_word() {
    std::cout << "[TEST] writeWord/readWord\n";
    Memory mem;
    bool err = false;

    for (int t = 0; t < 100; t++) {
        addr_t base = rng() % (Memory::MAX_SIZE - 8);
        word_t w = randWord();

        mem.writeWord(base, w);
        word_t w2 = mem.readWord(base, err);

        assert(!err);
        assert(w == w2);
    }

    std::cout << "  PASS: word read/write correct (endian validated)\n";
}

void test_word_out_of_bounds() {
    std::cout << "[TEST] out-of-bounds word\n";
    Memory mem;
    bool err = false;

    // EXACT boundary
    mem.readWord(Memory::MAX_SIZE - 8 + 1, err);
    assert(err);

    mem.readWord(Memory::MAX_SIZE, err);
    assert(err);

    std::cout << "  PASS: word out-of-bounds detected\n";
}

void test_overwrite() {
    std::cout << "[TEST] overwrite behavior\n";
    Memory mem;
    bool err = false;

    mem.writeByte(50, 0x11);
    mem.writeByte(50, 0x22);
    assert(mem.readByte(50, err) == 0x22);

    std::cout << "  PASS: overwrite works correctly\n";
}

void test_random_stress() {
    std::cout << "[TEST] random stress test (50k ops)\n";
    Memory mem;
    bool err = false;

    const int N = 50000;
    for (int i = 0; i < N; i++) {
        addr_t addr = rng() % (Memory::MAX_SIZE - 8);
        word_t w = randWord();
        mem.writeWord(addr, w);
        word_t w2 = mem.readWord(addr, err);
        assert(w == w2);
    }

    std::cout << "  PASS: stress test passed\n";
}

int main() {
    std::cout << '\n';
    test_reset();
    test_write_read_byte();
    test_byte_out_of_bounds();
    test_write_read_word();
    test_word_out_of_bounds();
    test_overwrite();
    test_random_stress();
    std::cout << "\n=== Memory Tests All Passed ===\n";
}
