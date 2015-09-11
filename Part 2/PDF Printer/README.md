## Installation

1. Install NodeJS.
2. In the directory where this README lives, `cd` into the `print_webservice` directory and do `npm install`. That will install all dependencies (and PhantomJS) locally into the project directory. There will be warnings/extra output; it should be ignoreable unless it looks like an error.

## Usage
**Disclaimer:** My JavaScript sucks. This project is probably littered with obvious gotchas that someone who touches JS more than once in a blue moon would easily catch/fix. Feel free to fix them.

1. Start a static file webserver for the test page. `cd` into `Part 2/static` and do `python -m SimpleHTTPServer 8080` or whatever port you'd like to serve the page on (port 8081 is hardcoded for other parts of this demo, but the static service port is up to you).
 	- For folks on Python 3, do `python -m http.server 8080`.
2. Start the page-printing service. In another terminal/session, `cd` into `Part 2/print_webservice` directory and do `node print_webservice.js`. It should start listening on port 8081, and not output any errors.
3. In a browser, go to `http://localhost:8080` or whatever port you ran the Python static file server on. You should see a page with a "Get PDF" button, an image, and some red text.
4. Click the "Get PDF" button. You should be handed a (ugly, badly formatted) PDF of the page in question.

#### Multiple Captive Processes
To see the multiprocess creation-rate limiting in action, hammer in sequence (or send requests using JS) on the "Get PDF" button. The print_webservice logs will eventually show "no phantoms are available to service your request" errors when the captive-process-pool-limit (3, by default, but you can change it in code) is hit.

#### Static Content Caching
For bonus fun, watch the static files getting received inn the Python static asset server's log. The `SimpleHTTPServer` code sets `Cache-Control` by default (I think; it might use [etags](https://en.wikipedia.org/wiki/HTTP_ETag) instead), so static assets should only be served once per client process (once for loading the page in your browser, and once when each Phantom hits the page for the first time). The rest of the time, the HTML is all that should be retrieved. Refreshing the page forces a re-fetch (in Chrome, at least).

#### Printing Other Pages
For even more bonus fun, try putting URLs of other sites into the text box. For some reason, Google won't print (it causes an internal error that probably translates into "You don't know good JS lol silly backend coder"), but some other URLs (like [this one](http://www.linuxjournal.com/content/tech-tip-really-simple-http-server-python)) seem to work fine.

## TODOs
A lot of this is a toy/unfinished. Stuff that could be tuned up if this were to be adapted for real use (and not just rewritten from scratch which, let's face it, is probably a better idea) is as follows:

- Error handling. A lot of my callbacks don't receive or inspect errors.
- Cookies. We can't print pages from a logged-in session now.
- Ugly cross-domain allowance hacks, since the replies are being sent to the client browser from a different website than was originally requested when the page was displayed. A redirect might fix this.
- Cleaning up phantoms/over capacity handling. It would be fairly trivial with `setTimeout` to dispose of phantom objects in the stored set if they remained unused for a certain amount of time. It would be similarly easy to add some sort of "surge" capacity, i.e. "normally there should only be 5 captive processes, but if there's a volume spike, allow there to be 10 for a little while." 
- Per-phantom parallelization. Phantom isn't *entirely* synchronous when it converts webpages. It can do a little bit in parallel internally, just like a real browser can render tabs in parallel. Instead of a "one PDF per phantom, up to N phantoms around at a time" model, it might be possible to add a dimension of "M conversion jobs per phantom" as well and save on throughput/process creation performance/cache hitting.