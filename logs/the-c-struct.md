# On the topic of struct triviality

C++ has such a problem that was understandable at the start, but completely baffling today. It has been a major blocker of the C++ evolutionary timeline for decades and the C++ committee always has to workaround a mistake that came since the beginning of C++.

### Some history behind C++ inception and the evolution of C++

Decades ago in 1979, "C with Classes" development has begun by Bjarne Stroustrup. Indeed, initially, it's just a C compiler with added features like classes, stronger typing, default arguments and more.

By this point, for convenience, the `struct` keyword simply becomes a C++ class with public visibility, following the rest of the object model C++ now relies on.

As such, to make sure a `struct` simply acts like a struct again in C, programmers today has to write boilerplate defensive triviality tests and static assertions, along with using concepts and further type traits to make sure that the a `struct` is trivial without any hidden virtual pointers or hidden constructors or destructors.

Naturally, this caused a huge problem to the C++ committee. C added *designated initializers*. C added *compound literals*. Very much so, C++ programmers wanted them too. So why did it take until C++20 that they finally added designated initializers only for it to be a dumbed down and strict version of the relaxed, ergonomically viable C?

Due to the coupling of data structures and lifecycle behaviour by letting the struct having the exact same properties as the C++ class but default public visibility, the committee has no choice but what may seem to us be pedantic about object lifecycles.

C++ clearly lacks a data container. The language is incapable of declaring a simple data container but simply has to emulate what could've been over decades ago. Concepts exist, but it pulls implementations into your headers. To guarantee that a `struct` is trivial you need triviality assertions on every single trivial struct you declare. They are the consequences of an unknowing decision by Bjarne. As C continues to evolve without the burden of lifecycles, C++ will fall behind C.

Rust already solved the issue. `#[repr(C)]` is the solution due to the Rust compiler aggressively reordering struct layouts during optimization, and this attribute tells the compiler to keep the data layout as it is. C++ cannot reclaim the struct keyword. If the committee makes `struct` act like a C struct with triviality enforced in the language level, virtually 100% of softwares will not compile today. For a language that seems to couple with C as a "strict superset of C", it somehow hates C.

However, `#[repr(C)]` when used in pure Rust, if you mix high level data types from Rust, it's UB if used anywhere. When passed to C, it's a hard compiler error because it's not a valid C type.If we just blindly bring in how it works in Rust to C++, it simply doesn't work as C++ is, well, in name, C. There's no FFI.

### What I think C++ needs

Guys, it takes two fucking brain cells. We just take a dead keyword, along with an invalid usage of said keyword, we magically get something out of it. Take this syntax error:

```cpp
register struct Vec3 {
  float x, y, z;
};
```

It won't compile. There's no program that ever does this since the inception of the C programming language itself. What if we give it meaning? 

By prefixing `register`, an unused and reserved keyword in C++, this enables the C++ compiler to uphold the triviality of the data container strictly to the C ABI. The compiler will reject any virtual pointers, constructors, destructors and anything that breaks standard layouts, trivial copying, trivial construction(uninitialized memory) and more. As for methods... I think as long as it's object-based and composition-based, it shouldn't affect any triviality as back in "C with Classes" era, they were syntactic sugar that uses the implicit `this` and compiles down to free functions by the compiler.

Some people may think that `register struct` is terrible syntax. Well, just see how overloaded `static` and `auto` is. There's no reason to be a hypocrite about, because as far as I know, C++ is all about solving problems. This is exactly it.

As such, this unlocks everything C can do with a struct. Including unrestricted designated initializers and compound literals. No committee bickering, ever. We don't invent new syntax, we just give a syntax error a valid meaning. Genius isn't it?

We defined our `Vec3` above, and if compiled with a hypothetical flag, let's say `-fregister-struct`, it compiles. Let's use it as C intended.

```cpp
void some_c_function(Vec3 *vec);

int main() {
  Vec3 vec{.z = 1.0f,
           .y = 0.0f}; // Unordered without any strict ISO complaints.
  some_c_function(
      &(Vec3){.z = 1.0f,
              .y = 0.0f}); // No complaints about compound literals, and no
                           // complaints about taking the address of an rvalue.
                           // Because our Vec3 has no lifecycle baggage that the
                           // current C++ object model carries.
  return 0;
}
```

This is it. C++ programmers could get their structs back. If we try to violate triviality:

```cpp
register struct Vec3 {
  float x = 0.0f; // Compiler error as it is automatically zeroed out
  float y = 0.0f;
  float z = 0.0f;
};

register struct Box {
  // Defining CTOR/DTOR and virtuals and friends here would be a compiler error.
public:
  Box(int w, int h) : width(w), height(h) {} // Nope~

private:
  int width, height;
};
```

Changing to a `class` will give your type the traits and stuff C++ needs.

```cpp
// Are you happy now?
class Box {
public:
  Box(int w, int h) : width(w), height(h) {} // Compiles~

private:
  int width, height;
};
```

Importantly, you can't inherit a `register struct`. Composition will work just like C.
```cpp
register struct BaseObject {
  // raw pointers and stuff
};

// Compiler error.
struct Object : public BaseObject {
  // insert code, whatever
};

// But...
struct Object {
  BaseObject base; // It works.
  // whatever
}
```

As for `register class` usage, this simply depends on how much you want the compiler to work. Semantically this doesn't make sense, but it deserves some attention.

```cpp
// Compiler error? Treat as struct? Default private visibility?
register class Object {};
```

### Why can't we have this yet?

Because it's dumb. It's not academic enough. This idea will get buried to the ground in some random blog post, and the committee will continue to struggle in their stubborn, legacy mess.

You could say that the C++ committee can use attributes for this instead. But... no. Attributes shouldn't turn valid C++ code into compile errors. Best they could do is to warn. Therefore only a new syntax deriving from an invalid one will only make sure that C++ can reclaim the `struct`.
