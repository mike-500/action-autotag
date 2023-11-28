# Autotag Flutter/Dart App
This is a fork from [jacopocarlini/action-autotag](https://github.com/jacopocarlini/action-autotag) for **Flutter/Dart** application.

This action will read a `pubspec.yaml` file and compare the `version` attribute to the project's known tags. If a corresponding tag does not exist, it will be created.

Usually, the version number is three numbers separated by dots, followed by an optional build number separated by a +, such as `1.2.21+7`. **The optional build number is ignored when the tag is created**.

## Usage

The following is an example `.github/workflows/main.yml` that will execute when a `push` to the `main` branch occurs.

```yaml
name: Create Tag

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: mike-500/action-autotag@4.0.0
      with:
        GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
```

To make this work, the workflow must have the checkout action _before_ the autotag action.

This **order** is important!

```yaml
- uses: actions/checkout@v2
- uses: mike-500/action-autotag@4.0.0
```

> If the repository is not checked out first, the autotagger cannot find the pubspec.yaml file.

## Configuration

The `GITHUB_TOKEN` must be passed in. Without this, it is not possible to create a new tag. Make sure the autotag action looks like the following example:

```yaml
- uses: jacopocarlini/action-autotag@stable
  with:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
```

The action will automatically extract the token at runtime. **DO NOT MANUALLY ENTER YOUR TOKEN.** If you put the actual token in your workflow file, you'll make it accessible (in plaintext) to anyone who ever views the repository (it will be in your git history).

## Developer Notes

If you are building an action that runs after this one, be aware this action produces several [outputs](https://help.github.com/en/articles/metadata-syntax-for-github-actions#outputs):

1. `tagname` will be empty if no tag was created, or it will be the value of the new tag.

---

## Credits
Forked by [Klemensas](https://github.com/Klemensas)

This action was originally created by [Corey Butler](https://github.com/coreybutler).
