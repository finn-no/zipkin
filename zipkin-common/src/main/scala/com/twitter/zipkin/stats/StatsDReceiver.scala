package com.twitter.zipkin.stats

import com.timgroup.statsd.NonBlockingStatsDClient
import com.twitter.conversions.time._
import com.twitter.finagle.stats._
import com.twitter.finagle.util.DefaultTimer
import com.twitter.util.TimerTask

import scala.collection.mutable

class StatsDReceiver extends StatsReceiverWithCumulativeGauges {
  val timer = DefaultTimer.twitter

  override val repr = this
  var timerTasks = new mutable.HashMap[Seq[String], TimerTask]

  private val statsdClient = new NonBlockingStatsDClient("zipkin", "127.0.0.1", 8125)

  override def counter(name: String*) = new Counter {
    override def incr(delta: Int): Unit = {
      statsdClient.incrementCounter(fullName(name))
    }
  }

  override def stat(name: String*) = new Stat {
    override def add(value: Float): Unit = {
      statsdClient.histogram(fullName(name), value)
    }
  }

  override def addGauge(name: String*)(f: => Float): Gauge = new Gauge {
    statsdClient.gauge(fullName(name), f)
    override def remove(): Unit = Unit
  }

  protected[this] def registerGauge(name: Seq[String], f: => Float) = synchronized {
    deregisterGauge(name)

    timerTasks(name) = timer.schedule(10.seconds) {
      statsdClient.gauge(fullName(name), f)
    }
  }

  protected[this] def deregisterGauge(name: Seq[String]) {
    timerTasks.remove(name) foreach { _.cancel() }
  }

  private def fullName(name: Seq[String]) = name mkString "/"
}
