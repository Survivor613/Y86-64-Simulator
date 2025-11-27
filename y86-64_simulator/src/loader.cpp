#include "../include/loader.h"
#include <sstream>

static inline std::string trim(const std::string& s){  // 不修改 s, 仅仅 return s.substr
    size_t start = s.find_first_not_of(" \t");  // 寻找 s 中第一个不包含 ' ' 和 '\t' 的位置，是的你没看错这个函数能同时搜索排除这两个字符
    if (start == std::string::npos) return "";
    size_t end = s.find_last_not_of(" \t");
    if (end == std::string::npos) return "";

    return s.substr(start, end-start+1);
}

bool Loader::load(std::string& content, Memory& mem){  // 类外定义成员函数永远不能再写 static, .h里面已经写过了
    // 初始化
    mem.reset();
    std::stringstream ss(content);
    // main会将 .yo 读入为 string类型的 content， 然后 load 再将 string 转化为 cin
    // 便于单元测试（可自定义content），并实现IO层与解析层（Loader）的分离，是最佳实践
    std::string line;

    while (std::getline(ss, line)){
        // 找冒号（分割地址）
        size_t colonPos = line.find(':');
        if (colonPos == std::string::npos) continue; // 若无冒号则跳过该行

        // 找竖线（截掉注释），得到结束位置
        size_t pipePos = line.find('|');
        size_t endPos = (pipePos == std::string::npos ? line.size() : pipePos);

        // 提取地址字符串并转换为 uint64_t
        std::string addrStr = trim(line.substr(0, colonPos));
        if (addrStr.empty()) continue;

        addr_t addr;
        try{
            addr = std::stoull(addrStr, nullptr, 16);
        }
        catch(...) { continue; }

        // 提出 hex 字节区域
        std::string hexStr = trim(line.substr(colonPos+1, endPos-colonPos-1));
        if (hexStr.empty()) continue;

        bool invalidVal = 0;  // 记录 地址/Hex字节区域 是否合法
        // 每两个字符解析一个字节，转化为 uint8_t
        for (size_t i=0; i<hexStr.size(); i+=2){
            std::string byteHex = hexStr.substr(i, 2);  // string类型 byteHex
            try{
                byte_t byteVal = static_cast<uint8_t>(std::stoi(byteHex, nullptr, 16)); // string >> int >> uint8_t
                if (mem.writeByte(addr++, byteVal)) return false;
            }
            catch(...) {
                invalidVal = 1;
                break;   // 若无法识别 byteVal， 直接 break 跳出 for 循环，进入下一行的 while 循环
            }
        }

        if (invalidVal == 1) continue;
    }

    return true;
}