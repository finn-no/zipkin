package com.twitter.zipkin.stats

import java.net.InetAddress

import com.timgroup.statsd.NonBlockingStatsDClient
import com.twitter.conversions.time._
import com.twitter.finagle.stats._
import com.twitter.finagle.util.DefaultTimer
import com.twitter.util.TimerTask
import org.slf4j.LoggerFactory

import scala.collection.mutable

class StatsDReceiver(prefix: String) extends StatsReceiverWithCumulativeGauges {
  private val log = LoggerFactory.getLogger(this.getClass)

  val timer = DefaultTimer.twitter

  override val repr = this

  var timerTasks = new mutable.HashMap[String, TimerTask]

  val hostname = InetAddress
    .getLocalHost
    .getCanonicalHostName
    .split('.')
    .reverse
    .mkString(".")

  private val statsdPrefix = hostname+".zipkin-"+prefix

  private val statsdClient = new NonBlockingStatsDClient(statsdPrefix, "127.0.0.1", 8125)

  override def counter(name: String*) = new Counter {
    override def incr(delta: Int): Unit = {
//      log.debug("incr "+statsdPrefix + "." + fullName(name) + " delta "+delta)
      statsdClient.count(fullName(name), delta)
    }
  }

  override def stat(name: String*) = new Stat {
    override def add(value: Float): Unit = {
//      log.debug("add "+statsdPrefix + "." + fullName(name) + ": "+value)
      statsdClient.histogram(fullName(name), value)
    }
  }

  protected[this] def registerGauge(name: Seq[String], f: => Float) = synchronized {
//    log.debug("registerGauge "+statsdPrefix + "." + fullName(name))
    deregisterGauge(name)

    timerTasks(fullName(name)) = timer.schedule(10.seconds) {
      val currentValue = { f }
//      log.debug("current value for "+statsdPrefix + "." + fullName(name)+" = " + currentValue)
      statsdClient.gauge(fullName(name), currentValue)
    }
  }

  protected[this] def deregisterGauge(name: Seq[String]) {
//    log.debug("deregisterGauge "+statsdPrefix + "." + fullName(name))
    timerTasks.remove(fullName(name)) foreach { _.cancel() }
  }

  private def fullName(name: Seq[String]) = name mkString "."
}
