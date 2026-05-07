# Agent Notes

Welcome to 3D Slop, where the geometry is parametric, the artifacts are ignored, and the documentation is allowed to make eye contact with the absurdity of the situation.

## Documentation Voice

README files and human-facing docs should keep the repo's house style: funny, dry, and lightly sarcastic, like a build system that has seen things but still passes CI.

Use jokes as seasoning, not structural support. Commands, file paths, preset names, credits, and build instructions still need to be precise, because nobody wants to debug a punchline.

## Project Shape

Keep the root docs and root CMake file project-level. They should describe the shared artifact pipeline and collection layout without pretending one model collection is the whole universe.

Put collection-specific docs, preset lists, credits, and model targets inside that collection's directory. For example, `d-bricks/` owns its README and `CMakeLists.txt`, because even slop deserves boundaries.

## Build Artifacts

Generated files belong under `build/` or `dist/`, both of which are ignored. If a tool invents a new cache, intermediate file, preview export, or other little souvenir, add it to `.gitignore` before it starts acting like source code.

## Tone Checklist

- Keep the sarcasm friendly, not mean.
- Keep the technical details boringly correct.
- Keep root-level docs generic enough for future model collections.
- Keep collection docs specific enough that a tired human can still build the thing.
