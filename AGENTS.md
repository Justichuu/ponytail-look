# Ponytail

Follow `.cursor/skills/ponytail/SKILL.md`. Coding tasks only. `npm run try`.
Do not copy the skill into a User Rule.

## Before you publish

Asked for on 25 August 2026, in these words: "put rules in every github folder,
or somewhere you always remember and never disobey, to let claude opus commit or
push or especially publish code (public)", followed by "im scared to let you
loose." This is that file. It is written down because a session ends and the
next agent starts with nothing.

**Committing locally is not the gate. Pushing to a public remote is.** Commit
freely. Everything below applies the moment something becomes readable by a
stranger.

**Publishing is one way.** A public commit can be cloned, forked and cached
before it is deleted. Rewriting history does not recall it, because the old
objects stay reachable by hash until the host collects them, and forks keep
their own copy. Treat every push to a public remote as permanent.

**Never publish, in files, in commit metadata, or in history:**

- The owner's legal name, or any part of it. He is **Justichuu**, and that is
  the whole public identity. Findable is the goal. Named is not.
- Any personal email address. Commits use
  `103864306+Justichuu@users.noreply.github.com`. Check `git log --format=%ae`
  before a first push, not after.
- Windows profile paths. `C:\Users\<name>` leaks the same first name sideways.
- Absolute drive paths of any kind. Derive from the script location.

**Never name the exact checker in public copy.** Its principle is the valuable
part. Public text uses pseudonyms and known proofs. The faces are 1, 0 and U.
A model's answer is not a face.

**Someone else's work needs that person's yes, about that specific thing.**
Not a general good relationship, not relaxed feelings about credit, and not
your own read of their limits. Ask them, about this, and wait. Credit the
whole of what they did, not a shrunken version that makes room for us.

**Private to public is always the owner's call.** Never flip visibility. Prepare
the evidence, state what a stranger would see, and stop.

**Before a first push to any public remote, actually scan:**

```
git log --all --format='%an <%ae>' | sort -u      # metadata
git grep -Il "<name>\|<email>\|Users.<profile>"    # the tree
```

Report the counts. A scan you did not run is U, and U is not a yes.

**U is not where a question goes to rest.** "Nothing can be unknown under
socratic, unknown leads to known." Unknown means name the one thing that would
settle it and go get it. It never means proceed as though the answer were yes.
