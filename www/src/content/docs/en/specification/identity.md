---
title: Identity
description: 'Defines the identity computation shared across the architecture: normalization and hashing of entry content, identification of files and version states, and the written form of domain paths.'
dependsOn:
  - argument/truth-record-versioned-with-implementation
  - argument/derivable-content-in-tool-layer
sourceHash: 448587f471db702289abcdbb8cefc6d3cc620b3ac9b0a3d4ca0dae7ac86e189d
---

Identity defines how content acquires an identity that any tool can recompute. The cache keys of governance, the source identification of compilation, and entry identity are all built from the parts defined here; two implementations must compute the same identity for the same content, or sharing and flow cannot hold.

> This specification implements the content-hash keying of [Derivable Content Should Stay in the Tool Layer](/en/argument/derivable-content-in-tool-layer/); version identity builds on the shared version boundary provided by [The Truth Record Must Be Versioned with the Implementation](/en/argument/truth-record-versioned-with-implementation/). The arguments answer why; this specification answers how.

## Terminology

This specification expresses requirement levels with the following words: **must** — implementations allow no exceptions; **should** — followed by default, and deviation requires an explainable reason; **may** — left to the project's own decision. Negative forms correspond to the levels: **must not** is the must-level prohibition, and **should not** is the should-level prohibition.

## Entry Identity

An entry's identity is the hash of its content. The content structure specification constrains an entry to a single source line; the text to hash is the part after the entry marker up to the end of the line, and it **must** be normalized by the following rules:

- strip leading and trailing whitespace — whitespace characters are determined by the Unicode White_Space property — preserving internal whitespace as is;
- apply no unescaping and no syntax parsing — Markdown syntax characters belong to the content as written;
- normalize Unicode to NFC.

A change in a bolded term name is a change of identity, and that is correct behavior.

The normalized text is encoded as UTF-8 and hashed with SHA-256; the identity is its lowercase hexadecimal representation. Truncated display belongs to the tool layer and does not affect the stored full identity.

An entry's full identity consists of its container and its content hash; the container is the identity of the domain it belongs to plus the kind of file it sits in. A content hash alone cannot locate an entry across containers: entries with identical text legitimately exist in different domains, and they are different records.

## File and Version Identity

A file's identity is the SHA-256 of its byte content, with no normalization: files are native objects of the repository, and bytes are identity.

Committed state is expressed by the repository's native version identifier, such as a Git commit hash; this specification invents no version numbering of its own. A state containing uncommitted changes is expressed as a base version plus a collection of change records: each record contains the path, the change type — added, modified, or deleted — the file mode, and the hash of the content after the change; deletion records carry no content hash, and records are sorted by canonical path. A bare collection of content hashes cannot identify a state: files swapping contents, deletions, and renames leave the hash collection unchanged while changing the project's semantics. Serialization of the collection belongs to the integration specification; the semantics of the identification are given by the traceability obligation of the compilation specification.

## Domain Identity

A domain is identified by its path; the rules for determining the identity are given by the domain declaration specification, and this specification defines the written form of the path: relative to the repository root, separated by `/`, with no leading `./` and no trailing `/`; path segments **must not** be empty and **must not** be `.` or `..`. The spelling **must** match the entry in the repository tree byte for byte, with no case folding by the host file system and no Unicode normalization. The domain formed by the repository root takes the empty string as its path.

## Part Types

The parts that enter keys and source identification fall into four types, and the type accompanies the part into composition:

- **Entry**: computed per entry identity.
- **Text**: free text that does not live in the repository, such as ad-hoc prompts and the expression of tool built-in usage contexts. Normalization is: unify line breaks to LF, strip leading and trailing whitespace, and normalize Unicode to NFC; encode as UTF-8 and hash with SHA-256.
- **File**: computed per file identity.
- **Native**: objects that carry their own identifiers — repository events, release version numbers, the name and version of a transformation implementation — use their native identifiers and are not hashed again.

For collections built from multiple parts — file sets, evidence groups — each member is computed by its type; the ordering, boundary, and serialization of a collection belong to the integration specification.

## Out of Scope

How multiple parts are composed and serialized into one key belongs to the integration specification. The evolution of the hash algorithm and normalization rules is versioned with this specification; how an implementation declares the version it follows belongs to a future conformance convention.
