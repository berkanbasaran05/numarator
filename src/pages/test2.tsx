import { useEffect, useState, useRef } from "react";
import localFont from "next/font/local";
import { Nunito } from "next/font/google";
import { io, Socket } from "socket.io-client";
import Confetti from "react-confetti";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

interface Order {
  createdAt: string;
  updatedAt: string;
  id: number;
  number: string;
  status: string;
  companyId?: number;
  visible?: boolean;
}

interface NewOrderNotification {
  isVisible: boolean;
  order: Order | null;
}

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [prevOrders, setPrevOrders] = useState<Order[]>([]);
  const [notification, setNotification] = useState<NewOrderNotification>({
    isVisible: false,
    order: null,
  });
  const [notificationQueue, setNotificationQueue] = useState<Order[]>([]);
  const [isPortrait, setIsPortrait] = useState<boolean>(true);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(true);
  const [recentlyCompletedGlow, setRecentlyCompletedGlow] = useState<
    Record<number, boolean>
  >({});
  const newOrderSoundRef = useRef<HTMLAudioElement | null>(null);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const fetchOrders = async () => {
    try {
      const pathParts = window.location.pathname.split("/");
      const branchId = pathParts[pathParts.length - 1];
      const response = await fetch(
        `${process.env.NEXT_APP_API_URL}/api/customerScreen/branch/${branchId}`,
      );
      if (!response.ok) throw new Error("Veriler alınırken bir hata oluştu.");
      const data: Order[] = await response.json();

      const visibleOrders = data.filter((order) => order.visible !== false);
      setOrders((current) => {
        setPrevOrders(current);
        return visibleOrders;
      });
    } catch (error) {
      console.error("[Sipariş Takip] Güncelleme başarısız:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchOrders();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!newOrderSoundRef.current) {
      newOrderSoundRef.current = new Audio("/sounds/new-order.mp3");
      newOrderSoundRef.current.volume = 1;
    }
  }, []);

  useEffect(() => {
    if (!notification.isVisible && notificationQueue.length > 0) {
      const nextOrder = notificationQueue[0];
      setNotification({ isVisible: true, order: nextOrder });
      setNotificationQueue((q) => q.slice(1));
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
      const duration = nextOrder.status === "COMPLETED" ? 6500 : 3500;
      notificationTimerRef.current = setTimeout(() => {
        setNotification({ isVisible: false, order: null });
      }, duration);
    }
  }, [notification.isVisible, notificationQueue]);

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const pathParts = window.location.pathname.split("/");
    const branchId = pathParts[pathParts.length - 1];
    const key = process.env.NEXT_PUBLIC_CUSTOMERSCREEN_SOCKET_KEY;
    if (!branchId || !key) return;
    const socket: Socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      auth: { branchId, key },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });
    socket.on("connect", () => {
      setIsSocketConnected(true);
      fetchOrders();
      console.log("Müşteri ekranı socket bağlı!");
    });
    socket.on("disconnect", () => {
      setIsSocketConnected(false);
      console.warn("Socket bağlantısı koptu, tekrar bağlanıyor...");
    });
    socket.on("reconnect_attempt", () => {
      setIsSocketConnected(false);
    });
    socket.on("reconnect", () => {
      setIsSocketConnected(true);
      fetchOrders();
    });
    socket.on("newOrder", (order: Order) => {
      if (order.visible === false) return;
      if (branchId === "11") {
        try {
          newOrderSoundRef.current?.play().catch(() => {});
        } catch {}
      }
      setNotificationQueue((q) => [...q, order]);
      setOrders((prev) => {
        if (prev.some((o) => o.id === order.id)) return prev;
        setPrevOrders(prev);
        return [...prev, order];
      });
      fetchOrders();
    });
    socket.on("orderUpdated", (order: Order) => {
      if (order.visible === false) {
        setOrders((prev) => {
          setPrevOrders(prev);
          return prev.filter((o) => o.id !== order.id);
        });
        return;
      }
      setOrders((prev) => {
        setPrevOrders(prev);
        const existing = prev.find((o) => o.id === order.id);
        if (order.status === "COMPLETED" && existing?.status !== "COMPLETED") {
          setNotificationQueue((q) => [...q, order]);
          try {
            newOrderSoundRef.current?.play().catch(() => {});
          } catch {}
        }
        const index = prev.findIndex((o) => o.id === order.id);
        if (index === -1) return [...prev, order];
        const next = [...prev];
        next[index] = order;
        return next;
      });
    });
    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line
  }, []);

  const isNewOrder = (order: Order) => {
    return !prevOrders.find((prevOrder) => prevOrder.id === order.id);
  };

  const checkOrientation = () => {
    setIsPortrait(window.matchMedia("(orientation: portrait)").matches);
  };

  useEffect(() => {
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    return () => {
      window.removeEventListener("resize", checkOrientation);
    };
  }, []);

  useEffect(() => {
    if (orders.length === 0 && prevOrders.length === 0) return;
    const newlyCompleted = orders.filter((order) => {
      if (order.status !== "COMPLETED") return false;
      const wasNotCompletedBefore = prevOrders.some(
        (prev) => prev.id === order.id && prev.status !== "COMPLETED",
      );
      return wasNotCompletedBefore && !recentlyCompletedGlow[order.id];
    });
    if (newlyCompleted.length > 0) {
      const addFlags: Record<number, boolean> = {};
      newlyCompleted.forEach((o) => {
        addFlags[o.id] = true;
        setTimeout(() => {
          setRecentlyCompletedGlow((prev) => {
            const copy = { ...prev };
            delete copy[o.id];
            return copy;
          });
        }, 30000);
      });
      setRecentlyCompletedGlow((prev) => ({ ...prev, ...addFlags }));
    }
  }, [orders, prevOrders, recentlyCompletedGlow]);

  const now = Date.now();
  const preparingOrders = orders
    .filter((order) => {
      if (order.status !== "PAYED") return false;
      const diffMinutes =
        (now - new Date(order.createdAt).getTime()) / 1000 / 60;
      return diffMinutes <= 60;
    })
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    .slice(0, 12);

  const readyOrders = orders
    .filter((order) => {
      if (order.status !== "COMPLETED") return false;
      const diffMinutes =
        (now - new Date(order.updatedAt).getTime()) / 1000 / 60;
      return diffMinutes <= 5;
    })
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 8);

  const isReadyNotice = notification.order?.status === "COMPLETED";

  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} 
        relative bg-brand-blue-primary min-h-screen h-screen w-screen overflow-hidden select-none
        flex flex-col items-center p-2 sm:p-3 md:p-5 lg:p-6 
        font-[family-name:var(--font-nunito)] max-w-screen-2xl mx-auto`}
      style={{ maxHeight: "100vh", maxWidth: "100vw" }}
    >
      <img
        src="/images/ajantavuk.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-5 pointer-events-none select-none z-0"
        draggable="false"
        style={{ maxWidth: "100vw", maxHeight: "100vh" }}
      />
      <style jsx>{`
        @keyframes neonGlowPAYED {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(236, 59, 25, 0.35);
          }
          50% {
            box-shadow: 0 0 22px 4px rgba(236, 59, 25, 0.55);
          }
        }

        @keyframes neonGlowCOMPLETED {
          0%,
          100% {
            text-shadow:
              0 0 10px rgba(248, 170, 33, 0.7),
              0 0 22px rgba(248, 170, 33, 0.4);
          }
          50% {
            text-shadow:
              0 0 18px rgba(248, 170, 33, 0.95),
              0 0 42px rgba(248, 170, 33, 0.65);
          }
        }

        @keyframes numberAppear {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.5);
          }
          60% {
            transform: translateY(-10px) scale(1.2);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes slideIn {
          0% {
            opacity: 0;
            transform: translateY(28px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes liveDot {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(0.55);
            opacity: 0.45;
          }
        }

        @keyframes readyPulse {
          0%,
          100% {
            transform: scale(1);
            box-shadow:
              0 0 0 0 rgba(248, 170, 33, 0.55),
              0 10px 24px rgba(0, 0, 0, 0.28);
          }
          50% {
            transform: scale(1.06);
            box-shadow:
              0 0 0 10px rgba(248, 170, 33, 0),
              0 16px 36px rgba(248, 170, 33, 0.45);
          }
        }

        @keyframes readyIdleGlow {
          0%,
          100% {
            box-shadow:
              0 8px 18px rgba(0, 0, 0, 0.22),
              0 0 0 0 rgba(248, 170, 33, 0.2);
          }
          50% {
            box-shadow:
              0 12px 28px rgba(0, 0, 0, 0.28),
              0 0 28px 2px rgba(248, 170, 33, 0.35);
          }
        }

        @keyframes overlayIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes overlayCardIn {
          0% {
            opacity: 0;
            transform: scale(0.86) translateY(24px);
          }
          70% {
            transform: scale(1.03) translateY(-6px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes overlayBar {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }

        .number-animation {
          display: inline-block;
          min-width: clamp(80px, 10vw, 200px);
        }

        .number-animation > span {
          display: inline-block;
          animation: numberAppear 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          font-size: clamp(4.2rem, 12.8vw, 14.8rem);
        }

        .neon-text-PAYED,
        .neon-text-COMPLETED {
          animation: neonGlowCOMPLETED 2s ease-in-out infinite;
        }

        .new-order-PAYED {
          animation: neonGlowPAYED 1.6s ease-in-out infinite;
        }

        .slide-in {
          animation: slideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) both;
        }

        .live-dot {
          animation: liveDot 1.2s ease-in-out infinite;
        }

        .prep-card {
          width: max-content;
          min-width: 4ch;
          height: 1.25em;
          padding: 0.12em 0.38em;
          font-size: clamp(2.1rem, 4vw, 3.6rem);
          font-variant-numeric: tabular-nums;
          line-height: 1;
          white-space: nowrap;
          box-sizing: content-box;
          flex-shrink: 0;
        }

        .ready-card {
          width: max-content;
          min-width: 4ch;
          height: 1.22em;
          padding: 0.1em 0.42em;
          font-size: clamp(3rem, 6.2vw, 6.4rem);
          font-variant-numeric: tabular-nums;
          line-height: 1;
          white-space: nowrap;
          box-sizing: content-box;
          flex-shrink: 0;
          animation: readyIdleGlow 2.8s ease-in-out infinite;
        }

        .ready-card-hot {
          z-index: 20;
          animation: readyPulse 1.15s ease-in-out infinite;
        }

        .overlay-root {
          animation: overlayIn 0.25s ease-out;
        }

        .overlay-card {
          animation: overlayCardIn 0.55s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .overlay-timer {
          transform-origin: left center;
        }
      `}</style>

      <div className="relative z-10 w-full shrink-0 flex items-center justify-center py-1 sm:py-2 slide-in">
        <img
          className="h-[6.5vw] max-h-[72px] object-contain pointer-events-none"
          src={"/images/colored.svg"}
          alt="Logo"
          draggable="false"
        />
      </div>

      <div className="relative z-10 w-full min-h-0 flex-1 flex flex-col gap-3 lg:gap-4">
        <section
          className="w-full flex-[0.78] min-h-0 flex flex-col gap-2 sm:gap-3 px-1 sm:px-2 slide-in"
          style={{ animationDelay: "0.12s" }}
        >
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1.5 h-[0.45vw] min-h-[3px] max-h-2 w-full rounded-full bg-[#EC3B19]" />
              <div className="flex items-center gap-3">
                <span className="live-dot inline-block h-3.5 w-3.5 rounded-full bg-[#EC3B19]" />
                <h2 className="text-[clamp(1.7rem,3.4vw,3.4rem)] leading-none font-extrabold text-[#EC3B19]">
                  Siparişiniz Hazırlanıyor
                </h2>
              </div>
              <p className="mt-1 pl-7 text-[clamp(0.85rem,1.35vw,1.2rem)] font-semibold text-white/45">
                Numaranız burada, mutfak hazırlıyor
              </p>
            </div>
            {preparingOrders.length > 0 && (
              <span className="mb-1 shrink-0 rounded-full border-2 border-[#EC3B19] bg-[#EC3B19]/15 px-3 py-1 text-[clamp(1rem,1.6vw,1.4rem)] font-extrabold text-[#EC3B19]">
                {preparingOrders.length}
              </span>
            )}
          </div>

          <div className="relative min-h-0 flex-1">
            <div
              className={`grid h-full w-full content-start justify-items-center gap-3 sm:gap-4 overflow-hidden ${
                isPortrait
                  ? "grid-cols-3"
                  : "grid-cols-4 sm:grid-cols-5 lg:grid-cols-6"
              }`}
            >
              {preparingOrders.length === 0 ? (
                <p className="col-span-full pt-6 text-center text-[clamp(1.1rem,1.8vw,1.5rem)] font-bold text-white/25">
                  Şu an hazırlanan sipariş yok
                </p>
              ) : (
                preparingOrders.map((order, index) => (
                  <span
                    key={order.id}
                    className={`prep-card items-center flex justify-center rounded-xl text-white border-[2px] bg-[#EC3B19] border-black pointer-events-none select-none slide-in font-extrabold ${
                      isNewOrder(order) ? "new-order-PAYED" : ""
                    }`}
                    style={{
                      animationDelay: `${index * 0.06}s`,
                      opacity: isNewOrder(order) ? 1 : 0.92,
                    }}
                  >
                    {order.number || "N/A"}
                  </span>
                ))
              )}
            </div>
          </div>
        </section>

        <section
          className="ready-stage w-full flex-[1.35] min-h-0 flex flex-col gap-2 sm:gap-3 rounded-2xl border-2 border-[#F8AA21] bg-[#F8AA21] p-3 sm:p-4 md:p-5 slide-in"
          style={{ animationDelay: "0.22s" }}
        >
          <div className="flex items-end justify-between gap-3 shrink-0">
            <div>
              <p className="text-[clamp(1rem,1.7vw,1.45rem)] font-bold tracking-wide text-[#153542]/55">
                Gelin alın — Afiyet olsun
              </p>
              <h2 className="text-[clamp(2rem,4.2vw,4rem)] leading-none font-black text-[#153542]">
                Siparişiniz Hazır
              </h2>
            </div>
            {readyOrders.length > 0 && (
              <span className="rounded-full bg-[#153542] px-4 py-1.5 text-[clamp(1.1rem,1.8vw,1.6rem)] font-black text-[#F8AA21]">
                {readyOrders.length}
              </span>
            )}
          </div>

          <div
            className={`grid min-h-0 flex-1 auto-rows-min content-start justify-items-center gap-3 sm:gap-4 overflow-visible ${
              isPortrait ? "grid-cols-2" : "grid-cols-3 xl:grid-cols-4"
            }`}
          >
            {readyOrders.length === 0 ? (
              <div className="col-span-full flex h-full min-h-[8rem] items-center justify-center">
                <p className="text-center text-[clamp(1.2rem,2.1vw,1.8rem)] font-extrabold text-[#153542]/28">
                  Hazır sipariş bekleniyor
                </p>
              </div>
            ) : (
              readyOrders.map((order, index) => {
                const isJustReady = !!recentlyCompletedGlow[order.id];
                return (
                  <span
                    key={order.id}
                    className={`ready-card relative items-center flex justify-center rounded-xl text-[#153542] bg-white border-  border-[#153542] pointer-events-none select-none font-black ${
                      isJustReady ? "ready-card-hot" : "slide-in"
                    }`}
                    style={{
                      animationDelay: isJustReady ? "0s" : `${index * 0.06}s`,
                    }}
                  >
                    {isJustReady && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[#EC3B19] px-2.5 py-0.5 text-[clamp(0.7rem,1vw,0.95rem)] font-black tracking-wide text-white">
                        YENİ
                      </span>
                    )}
                    {order.number || "N/A"}
                  </span>
                );
              })
            )}
          </div>
        </section>
      </div>

      {notification.isVisible && notification.order && (
        <div
          className={`overlay-root fixed inset-0 z-50 flex items-center justify-center ${
            isReadyNotice
              ? "bg-[#F8AA21]"
              : "bg-brand-blue-primary bg-opacity-95"
          }`}
        >
          {isReadyNotice && <Confetti recycle={false} numberOfPieces={220} />}
          <div className="overlay-card relative w-[min(860px,92vw)] flex flex-col items-center space-y-6 px-4 pb-8">
            <img
              src="/images/colored.svg"
              alt="Logo"
              className="w-[min(360px,55vw)] object-contain"
            />
            <div className="relative w-full flex justify-center items-center">
              <img
                src="/images/chicken.png"
                className="w-full h-auto max-w-[520px] max-h-[42vh] object-contain"
                alt=""
              />
            </div>
            <div
              className={`text-center flex flex-col space-y-2 ${
                isReadyNotice ? "text-[#153542]" : "text-white"
              }`}
            >
              <p
                className={`text-[clamp(1.1rem,2vw,1.6rem)] font-bold tracking-wide ${
                  isReadyNotice ? "text-[#153542]/70" : "text-white/70"
                }`}
              >
                {isReadyNotice
                  ? "Numaranızı kontrol edin"
                  : "Siparişiniz alındı"}
              </p>
              <h2
                className={`text-[clamp(2.4rem,5vw,4.4rem)] font-black leading-none ${
                  isReadyNotice ? "" : "neon-text-PAYED"
                }`}
              >
                {isReadyNotice ? "Siparişiniz Hazır" : "Hazırlanıyor"}
              </h2>
              <p className="font-black flex flex-col items-center">
                <span className="number-animation">
                  {notification.order.number?.split("").map((digit, index) => (
                    <span
                      key={index}
                      className="font-black"
                      style={{
                        animationDelay: `${index * 0.1}s`,
                        fontSize: "clamp(4.8rem, 16.9vw, 17.5rem)",
                      }}
                    >
                      {digit}
                    </span>
                  )) || notification.order.number}
                </span>
                <span className="text-[clamp(1.2rem,2.2vw,1.9rem)] font-extrabold">
                  {isReadyNotice ? "Lütfen teslim alın" : "Sipariş Numarası"}
                </span>
              </p>
            </div>
            <div className="absolute bottom-0 left-[12%] right-[12%] h-1.5 overflow-hidden rounded-full bg-black/15">
              <div
                className="overlay-timer h-full w-full rounded-full"
                style={{
                  background: isReadyNotice ? "#153542" : "#EC3B19",
                  animation: `overlayBar ${
                    isReadyNotice ? 6.5 : 3.5
                  }s linear forwards`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {!isSocketConnected && (
        <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-center py-2 z-[100] font-bold animate-pulse">
          Sunucu ile bağlantı kurulamadı. Tekrar bağlanıyor...
        </div>
      )}
    </div>
  );
}
