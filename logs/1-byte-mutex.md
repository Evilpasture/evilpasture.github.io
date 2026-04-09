## MagMutex's release and immediate adoption

- Upon creation and benchmarks, it is shown to be better than pthread_mutex, SRWLOCK, PyMutex. It also has a lower overhead, with only 1 single byte!
- Also brings along a Conditional Variable, also 1 byte. More predictable and fair compared to pthread_cond under high contention.

---

- Currently, MagMutex is immediately adopted to the Culverin project, replacing every single native OS mutex and PyMutex.