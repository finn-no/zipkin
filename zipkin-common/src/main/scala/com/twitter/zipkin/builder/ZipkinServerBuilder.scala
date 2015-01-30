/*
 * Copyright 2012 Twitter Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.twitter.zipkin.builder

import com.twitter.finagle.stats.{DefaultStatsReceiver, StatsReceiver}
import com.twitter.finagle.tracing.{Tracer, NullTracer}
import com.twitter.finagle.exception
import com.twitter.logging.config._
import com.twitter.logging.{ConsoleHandler, Logger, LoggerFactory}
import com.twitter.ostrich.admin._
import com.twitter.util.{Timer, JavaTimer}
import java.net.{InetAddress, InetSocketAddress}
import scala.util.matching.Regex

/**
 * Base builder for a Zipkin service
 */
case class ZipkinServerBuilder(
  serverPort              : Int,
  adminPort               : Int,
  serverAddress           : InetAddress              = InetAddress.getByAddress(Array[Byte](0,0,0,0)),
  loggers                 : List[LoggerFactory]      = List(LoggerFactory(level = Some(Level.DEBUG), handlers = List(ConsoleHandler()))),
  adminStatsNodes         : List[StatsFactory]       = List(StatsFactory(reporters = List(TimeSeriesCollectorFactory()))),
  adminStatsFilters       : List[Regex]              = List.empty,
  statsReceiver           : StatsReceiver            = DefaultStatsReceiver,
  tracer                  : Tracer                   = NullTracer,
  timer                   : Timer                    = new JavaTimer(true),
  exceptionMonitorFactory : exception.MonitorFactory = exception.NullMonitorFactory
) extends Builder[(RuntimeEnvironment) => Unit] {

  def serverPort(p: Int)                : ZipkinServerBuilder = copy(serverPort        = p)
  def adminPort(p: Int)                 : ZipkinServerBuilder = copy(adminPort         = p)
  def serverAddress(a: InetAddress)     : ZipkinServerBuilder = copy(serverAddress     = a)
  def loggers(l: List[LoggerFactory])   : ZipkinServerBuilder = copy(loggers           = l)
  def statsReceiver(s: StatsReceiver)   : ZipkinServerBuilder = copy(statsReceiver     = s)
  def tracer(t: Tracer)                 : ZipkinServerBuilder = copy(tracer            = t)
  def exceptionMonitorFactory(h: exception.MonitorFactory) : ZipkinServerBuilder
                                                              = copy(exceptionMonitorFactory = h)
  def timer(t: Timer)                   : ZipkinServerBuilder = copy(timer             = t)

  def addLogger(l: LoggerFactory)       : ZipkinServerBuilder = copy(loggers           = loggers :+ l)
  def addAdminStatsNode(n: StatsFactory): ZipkinServerBuilder = copy(adminStatsNodes   = adminStatsNodes :+ n)
  def addAdminStatsFilter(f: Regex)     : ZipkinServerBuilder = copy(adminStatsFilters = adminStatsFilters :+ f)

  private lazy val adminServiceFactory: AdminServiceFactory =
    AdminServiceFactory(
      httpPort = adminPort,
      statsNodes = adminStatsNodes,
      statsFilters = adminStatsFilters
    )

  lazy val socketAddress = new InetSocketAddress(serverAddress, serverPort)

  var adminHttpService: Option[AdminHttpService] = None

  def apply() = (runtime: RuntimeEnvironment) => {
    Logger.configure(loggers)
    adminHttpService = Some(adminServiceFactory(runtime))
  }
}
