# nodejs-demo
Materials for a pair of Code-Fu presentations on NodeJS, in August and September of 2015


## Part 1
Part 1 of this two-part presentation was given on 27-08-2015. It covered the basics of Node's event model, asynchronous reactor events segregated by I/O, and running shell commands/listening for events in the main loop. 

##### Additional links:

- [Asynchronous IO basic principles](http://www.slideshare.net/marc.seeger/seeger-aysnc-io)
- [NodeJS use cases and business value](http://nodeguide.com/convincing_the_boss.html)
- [Against NodeJS](https://news.ycombinator.com/item?id=4495101)

## Part 2
Part 2 was given on 03-09-2015, and covered webservice architecture in general, discussed athenahealth's various webservice implementations and infrastructure components, and demoed a toy/incomplete PDF conversion webservice that could be used to answer an existing scalability need in athenaNet's production infrastructure.

Demo materials (along with a very large writeup on the PDF conversion service and its raison d'être) are in the `Part 2` folder.

The other materials referred to in the presentation (which is in `Part 2/Presentation.pptx`) are:

- [Yegge's Platforms Rant](https://plus.google.com/+RipRowan/posts/eVeouesvaVX) (which everyone and their dog has read by now).
- [Your Server as a Function](http://monkey.org/~marius/funsrv.pdf).
- [Service-oriented architecture as part of a development *process* redesign (not just as a technology redesign) at SoundCloud](http://philcalcado.com/2015/09/08/how_we_ended_up_with_microservices.html).
- My dispatch and transport rant (available [internally](https://platform.blog.athenahealth.com/2014/11/24/transport-and-dispatch/) and, in a redacted/more general form, [externally](http://logicfault.blogspot.com/2014/11/dispatch-and-transport-systems.html)).
