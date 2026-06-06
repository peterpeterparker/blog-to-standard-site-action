# blog-to-standard-site-action

When you merge a pull request that adds a post to your blog, this GitHub Action kicks in: it reads the post's metadata, creates a `site.standard.document` record on the AT Protocol network, updates the frontmatter with the record URI, and opens a pull request with the changes.

<p align="center">
  <a href="https://github.com/peterpeterparker/blog-to-standard-site-action"><img alt="Checks" src="https://img.shields.io/github/actions/workflow/status/peterpeterparker/blog-to-standard-site-action/checks.yml?label=checks&style=flat-square"></a>
  <a href="https://github.com/peterpeterparker/blog-to-standard-site-action"><img alt="Tests" src="https://img.shields.io/github/actions/workflow/status/peterpeterparker/blog-to-standard-site-action/tests.yml?label=tests&style=flat-square"></a>
  <a href="https://github.com/peterpeterparker/blog-to-standard-site-action/releases"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/peterpeterparker/blog-to-standard-site-action?style=flat-square"></a>
</p>

## How it works

```
PR merged on GitHub
  -> GitHub Action detects new blog post
  -> Reads title, description, and path from frontmatter
  -> Creates a site.standard.document record on the AT Protocol network
  -> Updates the blog post frontmatter with the record AT URI
  -> Opens a pull request with the updated frontmatter
```

## Requirements

Before setting up this action you'll need:

- A [Bluesky](https://bsky.app) account
- A `site.standard.publication` record created on your PDS (see setup below)
- An app password from your Bluesky account settings

## Setup

> [!NOTE]
> New to Standard.Site? Read [Implementing Standard.Site](https://wil.to/posts/standard-site/) by Mat Marquis for a great overview of the setup process.

### Standard.Site publication record

1. Go to [Atmosphere Explorer](https://pdsls.dev), log in, and create a new record with collection `site.standard.publication` and the following body:

   ```json
   {
     "$type": "site.standard.publication",
     "url": "https://your-site.com",
     "name": "Your Site Name",
     "description": "A short description of your site.",
     "preferences": {
       "showInDiscover": true
     }
   }
   ```

2. Note the generated record key (rkey) from the record URL. For example, `3mnjy5srkem2h` in:

   ```
   at://did:plc:xxx/site.standard.publication/3mnjy5srkem2h
   ```

3. Add a `/.well-known/site.standard.publication` page to your site that serves the AT URI as plain text:

   ```
   at://did:plc:xxx/site.standard.publication/3mnjy5srkem2h
   ```

4. Add a `<link>` tag to the `<head>` of your site:
   ```html
   <link
     rel="site.standard.publication"
     href="at://did:plc:xxx/site.standard.publication/3mnjy5srkem2h"
   />
   ```

### Bluesky app password

1. Go to **Settings -> Privacy and Security -> App Passwords** in Bluesky
2. Create a new app password and copy it

### Blog post frontmatter

Your blog posts must include `path`, `title`, and `description` in their frontmatter:

```markdown
---
path: "/blog/my-post"
title: "My Post"
description: "A short description of my post."
---
```

## Outcome

Once the AT Protocol records have successfully been created, the related blog posts' frontmatter will be updated with their corresponding `standard_site` field:

```markdown
---
path: "/blog/my-post"
title: "My Post"
description: "A short description of my post."
standard_site: "at://did:plc:xxx/site.standard.document/xxxxxxxxxxxxxxx"
---
```

You'll get those changes through a pull request. Once you merge it, use the `standard_site` value to render a `<link>` tag in the `<head>` of the post page:

```html
<link rel="site.standard.document" href="at://did:plc:xxx/site.standard.document/xxxxxxxxxxxxxxx" />
```

## Usage

Add the following workflow to your repository at `.github/workflows/standard-site.yml`:

```yaml
name: Standard.Site

on:
  push:
    branches: [main]

jobs:
  standard-site:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
        with:
          persist-credentials: false

      - uses: peterpeterparker/blog-to-standard-site-action@aa819ec7849657d0b92235cba64bad05035f287b # v0.0.2
        with:
          blog_posts_path: "src/blog"
          github_token: ${{ secrets.GITHUB_TOKEN }}
          at_proto_app_password: ${{ secrets.AT_PROTO_APP_PASSWORD }}
          at_proto_did: "did:plc:xxxxxxxxxxxxxxxxxxxxxxxx"
          at_proto_publication_rkey: "your-publication-rkey"
```

## Inputs

| Input                       | Required | Description                                                                                     |
| --------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `blog_posts_path`           | yes      | Path to your blog posts directory (e.g. `src/blog`)                                             |
| `github_token`              | yes      | GitHub token used to fetch the blog posts and create a pull request with the Standard.Site URIs |
| `at_proto_did`              | yes      | Your AT Protocol Decentralized Identifier (DID)                                                 |
| `at_proto_app_password`     | yes      | Your Bluesky app password                                                                       |
| `at_proto_publication_rkey` | yes      | Record key of your `site.standard.publication` record                                           |

## Secrets

Add these to your repository under **Settings -> Secrets -> Actions**:

| Secret                  | Description               |
| ----------------------- | ------------------------- |
| `AT_PROTO_APP_PASSWORD` | Your Bluesky app password |

> [!TIP]
> `at_proto_publication_rkey` and `at_proto_did` are public - you can provide them directly in your workflow file.

## License

MIT
