<!-- # Ta11-Man.github.io -->

<p style="
font-size: 32px;
font-weight: bold;
color: #07ffedff;
filter: drop-shadow(0px 0px 8px rgba(7, 255, 237, 0.5));
text-shadow: 0 0 15px rgba(7, 255, 237, 0.6);
margin-bottom: 2vh;
text-align: left;
padding-left: 1vw;
pointer-events: none;
">Ta11-Man.github.io</p>

This _was_ a portfolio site for a school project. Now it's the front to my Github showcase to make it easier to navigate my projects.

It's loaded semi-dynamically from a JSON file so that I can taylor and polish how each repo is displayed (e.g. give it a friendly name). The commit bars are loaded automatically from a JSON file, which is updated automatically by Github actions.

For local testing, this command is probably needed:

```bash
python -m http.server
```

This is because (at least for Windows) there are protections that prevent html files from querying the local file system (JSON in this case). So we run it as a light-weight server.

I make this nice, as I tend to include a make file in my projects for even the smallest reasons; run make to serve :)
