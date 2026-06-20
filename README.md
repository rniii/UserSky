# UserSky

A userscript-based client mod for Bluesky.

## But why?

I just can't be bothered to use custom clients or social-app forks. I am used to accessing bsky.app
on my phone and computer and I don't really care about installing an App. But sometimes vanilla
Bluesky is annoying. So, this serves as a way for me or anyone masochistic enough to look at
minified code of an already open-source project to change just about anything in the web client.

The pitch is you install the userscript and you or anyone (please let me know if you make plugins!)
can make other userscripts which add patches:

```js
// ==UserScript==
// @name    My UserSky Plugin
// @author  Linus Torvalds
// @match   https://bsky.app/*
// @grant   none
// ==/UserScript==

const { declarePlugin, re } = UserSky;

declarePlugin({
    name: "MyPlugin",
    patches: [{
        find: ["UserAvatar:()=>", "usePlainRNImage:"], // src/view/com/util/UserAvatar.tsx
        replacement: {
            match: re`(?g)\i??("user"===\i?"circle":"square")`,
            // or plain regex.. note re`(?g)foo` == /foo/g
            match: /\w+\?\?\("user"===\w+\?"circle"\:"square"\)/g,
            replace: '"square"',
        },
    }],
})
```
