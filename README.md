![Zipkin (doc/zipkin-logo-200x119.jpg)](https://github.com/twitter/zipkin/raw/master/doc/zipkin-logo-200x119.jpg)

## FINN.no's fork of Zipkin

> [Zipkin](http://twitter.github.com/zipkin) is a distributed tracing system that helps us gather timing data
> for all the disparate services at Twitter.

## What our fork contains

# A hadoop job for aggregating trace data

You can find the code in the "zipkin-aggregate" submodule. In our setup, it runs every night at 3 AM. The job reads
data directly from Cassandra, analyses it with a Scalding/Hadoop job and then writes the results back into Cassandra.
This aggregate data can then be displayed in the "Aggregate" UI.

# Aggregate UI

![Aggregate UI](https://github.com/finn-no/zipkin/raw/finn-master/zipkin-finn.png "Screenshot")

We draw a graph of all services in the platform, built from the aggregated data. This graph is browseable
and shows metadata about each service/dependency.