#include <cassert>
#include <iostream>
#include "../include/loader.h"
#include "../include/memory.h"

void test_basic_instruction_load() {
    std::cout << "[TEST] basic instruction load\n";

    // 一个最小的 .yo 示例
    std::string yo =
        "0x000: 30f40002000000000000 | irmovq\n"
        "0x00a: 00                 | halt\n";

    Memory mem;

    bool ok = Loader::load(yo, mem);
    assert(ok);

    // 检查第一条指令是否正确写入
    bool err = false;
    byte_t b0 = mem.readByte(0x000, err);
    assert(!err && b0 == 0x30);

    byte_t b1 = mem.readByte(0x001, err);
    assert(!err && b1 == 0xf4);

    // 检查第二条指令（halt）
    byte_t halt = mem.readByte(0x00a, err);
    assert(!err && halt == 0x00);

    std::cout << "  PASS\n";
}

void test_label_line_no_hex() {
    std::cout << "[TEST] label line (no hex)\n";

    std::string yo =
        "0x010:                      | main:\n"
        "0x010: 30f40000000000000000 | irmovq\n";

    Memory mem;
    bool ok = Loader::load(yo, mem);
    assert(ok);

    bool err = false;
    // label 行不会写内存，所以第一次写入应从第二行开始
    assert(mem.readByte(0x010, err) == 0x30);

    std::cout << "  PASS\n";
}

void test_empty_and_comment_lines() {
    std::cout << "[TEST] empty & comment line\n";

    std::string yo =
        "                            | comment line\n"
        "\n"
        "0x020: 00 | halt\n";

    Memory mem;
    bool ok = Loader::load(yo, mem);
    assert(ok);

    bool err = false;
    assert(mem.readByte(0x020, err) == 0x00);

    std::cout << "  PASS\n";
}

void test_continuous_bytes() {
    std::cout << "[TEST] continuous bytes\n";

    std::string yo =
        "0x100: a1b2c3d4e5f60708 | data\n";

    Memory mem;
    bool ok = Loader::load(yo, mem);
    assert(ok);

    bool err = false;
    assert(mem.readByte(0x100, err) == 0xa1);
    assert(mem.readByte(0x101, err) == 0xb2);
    assert(mem.readByte(0x102, err) == 0xc3);
    assert(mem.readByte(0x103, err) == 0xd4);

    std::cout << "  PASS\n";
}

void test_wrong_hex_should_skip_line() {
    std::cout << "[TEST] invalid hex skip\n";

    std::string yo =
        "0x000: zz11ff | invalid hex\n"  // invalid
        "0x001: 30f4   | valid\n";

    Memory mem;
    bool ok = Loader::load(yo, mem);
    assert(ok);

    bool err = false;

    // 第一行是 invalid hex，不写入
    assert(mem.readByte(0x000, err) == 0x00);

    // 第二行正常写入
    assert(mem.readByte(0x001, err) == 0x30);

    std::cout << "  PASS\n";
}

void test_addr_parse_failure() {
    std::cout << "[TEST] invalid address skip\n";

    std::string yo =
        "xyz!: 30f4 | invalid address\n"   // 地址不是 hex
        "0x010: 00    | valid\n";

    Memory mem;
    bool ok = Loader::load(yo, mem);
    assert(ok);

    bool err = false;

    // 010 行正常写入
    assert(mem.readByte(0x010, err) == 0x00);

    std::cout << "  PASS\n";
}

void test_out_of_bound_write() {
    std::cout << "[TEST] out-of-bound detection\n";

    // Memory::MAX_SIZE 默认一般是 0x1000 或 4096，你自己定义的为准
    // 这里构造一个必越界的 yo 内容
    std::string yo =
        "0xFFFFFF: 30 | out of bound\n";

    Memory mem;
    bool ok = Loader::load(yo, mem);    

    // loader 应该返回 false
    assert(!ok);

    std::cout << "  PASS\n";
}

int main() {
    std::cout << '\n';
    test_basic_instruction_load();
    test_label_line_no_hex();
    test_empty_and_comment_lines();
    test_continuous_bytes();
    test_wrong_hex_should_skip_line();
    test_addr_parse_failure();
    test_out_of_bound_write();
    std::cout << "\n=== Loader Tests All Passed ===\n";
}
