#pragma once
#include "global.h"
#include "memory.h"
#include <string>

class Loader{
    public:
        // 解析 yo 内容并写入内存
        static bool load(std::string& content, Memory& mem);
};