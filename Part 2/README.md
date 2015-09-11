## TL;DR
This is a writeup and presentation about using NodeJS for writing webservices. A practical example is included: it's a PhantomJS/NodeJS webservice for converting PDFs, which can be scaled independently of other infrastructure components, caches static content in memory in persistent headless browser processes, and parallelizes its own conversion pipelines. See `PDF Printer/README.md` to get started.

## History/Architecture Summary

#### The Current Situation

The existing print-to-PDF functionality is great, and very cleverly implemented, given the architectural constraints of our platform at the time of this writing. The existing functionality works like this:

1. POST the URI of a page from a client's browser to an internal `.esp` page that is a dedicated print resource. 
2. In that `.esp` page, GET the HTML for the page whose URI was passed. 
3. Run a substitution (regex, not XML parsing) statement on the received HTML. Every time a static asset is found (an image, script, stylesheet, etc), do the following caching cleverness:
	- Rewrite the static asset's URI to be a local `file://` URI instead of a remote source. 
	- Check the filesystem for a matching named file younger than a certain age. If it is found, do nothing. 
	- Otherwise, GET the static file in question, and store it on the filesystem at the path referred to by the `file://` URI, and, if the file is text, run the same caching process (recur) on the file in question and rewrite/locally store any of _its_ static references.
4. Start an instance of a headless PhantomJS web browser, pass it the retrieved and altered HTML, and have it do some sanitization pre-print formatting of the document so it renders to a PDF more legibly. Drop the resulting altered HTML onto the disk in a temp file.
5. Shut down PhantomJS and start an instance of wkhtmltopdf, an all-in-one, minimal-config HTML-to-PDF converter, and convert the twice-munged HTML to a PDF and then send it in the response.

Step 3 is done in order to prevent every page-print request from fetching the entirety of the page's static assets (e.g. sprite files) from scratch. Were this to occur each time a page was converted, it would increase the disk and network load of every PDF conversion substantially, and would also potentially increase the runtime of the conversion to an unacceptable duration.

#### Drawbacks of the Current Situation
The existing functionality has a few drawbacks**\* **:

- **It's very complex.** The static-content-cache-defeating logic is robust to a point, but it's still fundamentally a highly involved regex parse of arbitrary HTML.
- **It's synchronous.** All content fetches are performed one after the other in the substitution loop. PhantomJS performs the local read operations on the rewritten `file://` URIs in parallel, but the acquiry/priming of the cache is done sequentially owing to the single-threaded nature of our webserver processes.
- **It's slow.** Fetching content and starting/shutting down instances of two very heavyweight subprocesses (PhantomJS and wkhtmltopdf) takes time.
- **It can't be isolated.** Since all `.esp` pages run on the same set of webservers, there's no way to dedicate a particular set of hosts for PDF conversion work so that normal client web requests don't increase the load where a PDF conversion is occurring, or vica versa. This also means that PDF conversion throughput capacity only scales as well as the size of the main production client-facing webserver fleet, as opposed to just being able to increase the number of PDF conversion hosts in response to a very conversion-happy client's unanticipated workload.
- **It's computationally expensive.** Writing lots of static content caches to disk (when the cache gets primed) is expensive in terms of I/O, but even more expensive is the act of creating and tearing down PhantomJS and wkhtmltopdf processes. Just starting PhantomJS takes more than a second sometimes, before any conversion occurs. The conversion/rendering itself is also very computationally expensive (and, for larger pages, memory intensive as well).

**\* To be clear: the existing solution is very well engineered, and is pretty close to _as good as we can get given the current infrastructure_. These limitations are externally imposed and are not in any way the fault of the current PDF conversion code, or coders.**

#### Isolating Conversion Work with the Current Methodology

If we wanted to isolate conversion work (onto its own servers) using the current methodology, a centralized transport location must be used. Asynchronous work requests could be placed for PDF conversions such that work would run on dedicated servers, but those asynchronous requests can't send responses to client or server code owing to the design of our background-job-shipping infrastructure. As a result, the isolation process looks something like:

1. Make an asynchronous, no-response-expected request for a PDF conversion on the dedicated conversion hosts. Tell that request to place the completed PDF in some central document store.
2. Have the client- or server-side code that made the request poll that central location until a timeout occurs or a PDF is created and stored there. 

That approach is far from optimal. It only solves one of the several performance/stability issues with the existing conversion system, and solves it by loading two centralized transport/storage systems: the message queuing system used to transport asynchronous background jobs, and whatever persistent storage system is used to temporarily store the converted PDFs. Furthermore, it increases complexity: polling logic and job dispatch logic have to be added, and so does code to clean up PDFs that failed to convert on time for whatever reason (errors, high load on conversion servers, asynchronous job queue backlogs).

#### Goals

Ideally, a lightweight webservice could be started on a set of PDF conversion servers, and client or server-side code could make conversion requests directly to that conversion service, and synchronously receive responses directly via HTTP. That remote service would ideally do the following:

- **Be lightweight.** It should only serve things necessary for PDF conversions, rather than being a full production application server running a single page that happens to convert PDFs.
- **Be able to convert PDFs in parallel.** Since most of the work happens in subprocesses or in the background/in operations using files or the network, every single IO/IPC operation should not be done in sequence; things that are parallelizable should be parallelized. 
- **Be simple**. Complex caching logic and HTML reparsing should be avoided if at all possible.
- **Be cheap.** Persistent resources should be initialized and re-used rather than incurring the expense of subprocess creation and teardown on every conversion.

#### Proposed Alterations

It turns out that a lot of those requirements can be fulfilled by making one simple architectural change: use PhantomJS exclusively for all conversion work, and use a persistent phantom subprocess. The persistent subprocess can render pages into PDFs as fast as the headless browser can render pages, and the entire browser stack doesn't have to be restarted for every conversion attempt; IPC can be used to hand a running Phantom engine new conversion requests. Wkhtmltopdf can be abandoned in favor of Phantom's native PDF conversion functionality. Furthermore, this solves the caching issue, since the in-memory static asset cache of PhantomJS will share assets between different pages to be rendered, and only invalidate/discard cache contents when they expire (e.g. due to a [`Cache-Control`](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching?hl=en#cache-control) headedr) or when PhantomJS shuts down. PhantomJS has bugs with caching on disk, so it couldn't previously be trusted to persist static content resources onto disk where Wkhtmltopdf could find them. Now, however, there's no cache handoff necessary, so in-memory caching can be used.

Parallelism/simplicity can be solved by using NodeJS for the conversion API service. Node is well-suited for this kind of task, but in this particular application it's just a time-saver tool; any language/platform that could asynchronously communicate with subprocesses and run a light HTTP server capable of handling multiple requests in parallel would work for this purpose as well. NodeJS also has plenty of robust libraries for communicating with persistent PhantomJS background processes.

#### Limitations of NodeJS


The parallelism doesn't come entirely for free, though. Since PhantomJS executes conversions mostly sequentially, and can only do a certain (small) number per subprocess, NodeJS's concurrency model doesn't actually buy us that much, since there's a near-sequential bottleneck of the most expensive part of work: rendering the page and converting it to PDF. All of the other stuff (handling HTTP requests, shipping temp files back to the client) can be parallelized, but not the core task. In order to cope with that, we'll create a set of multiple subprocesses, created on-demand, and not to exceed a certain built-in parallelism cap, and hand them each requests. This loses a little bit of the shared-static-content cache advantage, but not much; because of our application's architecture, the first conversion handled by each subprocess will take awhile, and fetch the vast majority of static resources, and all subsequent conversions will have a near-100% cache hit rate.

This has been implemented here in a toy/proof of concept way. See `PDF Printer/print_webservice/phantomset.js` for the very simple on-demand creation semaphore. It is probably buggy; I don't know enough about what counts as an "atomic" JavaScript action in Node to be able to predict how the interpreter's current frame will jump around as callbacks fire.

## Files
- The very bare-bones PowerPoint I threw together for the initial webservice demo is in `Presentation.pptx`. It's complete with my own internal stream of consciousness notes, with lots of typos and cursing. 
- The PDF conversion demo is in the `PDF Printer` directory. There's a `README.md` that describes how to use it. This is the PDF printer that actually works; the one I demoed in the presentation is in `Unused Files`.
- There are some other files in the `Unused Files` directory:
	- `first_attempt.js` is the static server I wrote for class. It had a lot of bugs, and didn't do multiple-captive-phantom maintenance. Most of its bugs arise from the fact that [phantom-proxy](https://github.com/sheebz/phantom-proxy), the package I was using to communicate with Phantom via IPC, is broken/abandonware/sucky. [Phridge](https://github.com/peerigon/phridge) seems to work better (and it comes with a bundled version of Phantom, which saves installation hassle, and also doesn't use [insane arcana](https://github.com/sgentle/phantomjs-node#how-does-it-work) to communicate with captive instances :) ). The `first_attempt` server *acts* like it works, but much of the time it's just returning the initial `page.pdf` conversion resultslt file it generated during the first request (Phantom then crashes on all subsequent requests, for arcane/unclear reasons).
	- `static_server.js` is a result of me not doing my research and failing to realize that Python's `SimpleHTTPServer` actually [*does* do static content caching](http://bugs.python.org/issue1417555). The NodeJS version in `static_server.js` is a very stupid, error-ignoring static file server that explicitly sets `Cache-Control` headers. It was only used for initial testing of static content cache invalidation.
