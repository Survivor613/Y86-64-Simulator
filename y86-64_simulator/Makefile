CXX = g++
CXXFLAGS = -std=c++17 -Wall -O2

TARGET = y86-64_simulator
SRCS = src/main.cpp src/register.cpp src/memory.cpp src/loader.cpp src/cpu.cpp
OBJS = $(SRCS:.cpp=.o)

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CXX) $(CXXFLAGS) -o $@ $^

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

clean:
	rm -f $(OBJS) $(TARGET)
