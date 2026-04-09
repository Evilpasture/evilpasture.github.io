# Designing a 1-Byte Mutex: High-Performance Concurrency in C23

**Date:** April 9, 2026  
**Category:** Systems Programming / Concurrency  
**Tags:** `C23`, `Atomics`, `Culverin`, `Low-Level`

In modern high-concurrency systems—particularly Entity Component Systems (ECS) and large-scale object graphs—memory overhead is the enemy of performance. Standard synchronization primitives are surprisingly bloated. A `pthread_mutex_t` on Linux is 40 bytes; on Windows, a `CRITICAL_SECTION` is 40 bytes. The closest competitor is `SRWLOCK`, around the size of a pointer(4-8 bytes).

If you have 10 million small objects in memory and each requires a lock, you are spending **400MB just on the mutex headers.** 

**MagMutex** was born out of a need to solve this. By utilizing a "Parking Lot" architecture, we reduced the per-object overhead to exactly **1 byte**, while actually outperforming native OS locks under high contention. Moreover, there is absolutely no dependency. You just need a modern C compiler(and definitely not MSVC~!).

---

## The Core Architecture: The Parking Lot

How the hell do you fit a wait-queue into a single byte? **You don't.** 

MagMutex uses the "Parking Lot" model, popularized by WebKit's `WTF::Lock` and more recently used in Python 3.14’s `PyMutex`. The 1-byte mutex itself contains only state bits. The actual heavy lifting (waiting, signaling, and queue management) happens in a global, sharded metadata structure.

### The 8-Bit State Machine
We utilize `_Atomic uint8_t` with a specific bitmask:
*   `0x01 (Locked)`: The mutex is held.
*   `0x02 (Has Waiters)`: Indicates that other threads are parked in the global lot.
*   `0x04 (Poisoned)`: A failure state indicating a panic occurred while the lock was held.

### Sharded Metadata & Cache Alignment
To avoid a global bottleneck, MagMutex hashes the memory address of the mutex to one of **256 global buckets**. 

A critical systems-level optimization here is **padding**. Each bucket is padded to **128 bytes**. This is specifically tuned for modern server CPUs and Apple Silicon (M1/M2/M3/M4), ensuring that two different buckets never share the same cache line. This eliminates **False Sharing**, allowing the parking lot to scale linearly with thread count.

---

## Performance Profile: Outperforming the Kernels

In our benchmarks, MagMutex didn't just match `pthread_mutex` and `SRWLOCK`—it beat them.

### Throughput & Scaling
As seen in the scaling plots(see the repo's README), MagMutex maintains superior throughput in the 1-8 thread range. This is achieved through **Adaptive Spinning**. Before context-switching to the kernel to "park" a thread, MagMutex executes an intelligent `yield`/`pause` loop. For short-held critical sections, the lock is often acquired without the thread ever leaving userspace.

### The "Barging" Advantage
MagMutex implements a **Decoupled Unlock**. We release the lock state *before* we signal the parking lot to wake up a waiter. This allows "Barging"—a new incoming thread can grab the lock immediately while the previously waiting thread is still waking up. While this sounds "unfair," it drastically increases total system throughput.

---

## Real-World Adoption: Culverin

The impact of MagMutex was immediately visible in the **Culverin** project (a Python wrapper for Jolt Physics). Culverin deals with massive object graphs where physics bodies are constantly accessed across multiple threads.

By replacing `PyMutex` and native OS locks with MagMutex:
1. **Memory Usage:** Reduced memory overhead **significantly**.
2. **Predictability:** In high-contention scenarios, the custom `MagCond` (Conditional Variable) proved far more predictable than `pthread_cond`, which often showed chaotic latency spikes in our distribution plots.

---

## The "Debug Powerhouse" Mode

Systems programming is often a battle against deadlocks. While the Release version is 1 byte, the Debug mode (`-DMAG_DEBUG`) transforms MagMutex into a diagnostic tool.

It builds a **Dynamic Dependency Graph** using a Depth First Search (DFS) algorithm. If you attempt to acquire locks in an order that could cause a circular dependency, MagMutex will abort the program and provide a full diagnostic trace of the offending threads *before* the deadlock actually occurs.

---

## Conclusion & Build

MagMutex proves that you don't need 40 bytes to protect a resource. By moving complexity into sharded global metadata and staying "hardware-sympathetic" with cache-line alignment, it is possible to have both minimal memory footprints and elite performance.

**Build Requirements:**
*   **Language:** C23 with GNU extensions.
*   **Compiler:** LLVM/Clang (MSVC is currently not supported due to atomics implementation differences).

```zsh
# Experience the performance yourself
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
cmake --build .
./Mag_Benchmarks # or whatever the executable name is
```