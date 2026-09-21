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
      setTimeout(() => {
        setNotification({ isVisible: false, order: null });
      }, 5000);
    }
  }, [notification.isVisible, notificationQueue]);

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
      try {
        newOrderSoundRef.current?.play().catch(() => {});
      } catch {}
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

  if (notification.isVisible && notification.order) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-brand-yellow-primary bg-opacity-90 z-50">
        {notification.order.status === "PAYED" && <Confetti />}
        <div className="relative w-[800px] flex flex-col items-center space-y-8">
          <img
            src="/images/colored.svg"
            alt="Logo"
            className="w-[400px] object-contain"
          />
          <div
            className="relative w-full flex justify-center items-center"
            style={{ minHeight: "0" }}
          >
            <div
              className="relative flex items-center justify-center"
              style={{ width: "clamp(300px, 40vw, 600px)", height: "auto" }}
            >
              <img
                src="/images/chicken.png"
                className="w-full h-auto max-w-[600px] max-h-[60vh] object-contain"
                alt="Ticket Background"
                style={{ display: "block" }}
              />
              <div
                className={`absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center w-[clamp(180px,18vw,340px)] h-[clamp(60px,7vw,120px)]`}
                style={{
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              />
            </div>
          </div>
          <div className="text-white text-center flex flex-col space-y-4">
            <h2
              className={`text-5xl font-bold ${
                notification.order.status === "PAYED"
                  ? "neon-text-PAYED"
                  : "neon-text-COMPLETED"
              }`}
            >
              {notification.order.status === "PAYED"
                ? "Sipariş Hazırlanıyor"
                : "Sipariş Hazır"}
            </h2>
            <p
              className={`text-5xl font-semibold flex flex-col ${
                notification.order.status === "PAYED"
                  ? "neon-text-PAYED"
                  : "neon-text-COMPLETED"
              }`}
            >
              <span className="number-animation ml-2">
                {notification.order.number?.split("").map((digit, index) => (
                  <span
                    key={index}
                    className="font-extrabold"
                    style={{
                      animationDelay: `${index * 0.1}s`,
                      fontSize: "clamp(4.8rem, 16.9vw, 17.5rem)",
                    }}
                  >
                    {digit}
                  </span>
                )) || notification.order.number}
              </span>
              <span className="text-3xl font-bold">Sipariş Numarası</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} 
        bg-brand-white-primary min-h-screen h-screen w-screen overflow-hidden select-none
        flex flex-col items-center space-y-2 sm:space-y-4 p-2 sm:p-4 md:p-8 lg:p-12 
        font-[family-name:var(--font-nunito)] max-w-screen-2xl mx-auto aspect-[16/9]`}
      style={{ maxHeight: "100vh", maxWidth: "100vw" }}
    >
      <img
        src="/images/ajantavuk.png"
        alt="Arka Plan Tavuk"
        className="absolute inset-0 w-full h-full object-cover opacity-5 pointer-events-none select-none z-0"
        draggable="false"
        style={{ maxWidth: "100vw", maxHeight: "100vh" }}
      />
      <style jsx>{`
        @keyframes neonGlowPAYED {
          0% {
            text-shadow:
              0 0 10px rgba(245, 158, 11, 0.7),
              0 0 20px rgba(245, 158, 11, 0.5),
              0 0 30px rgba(245, 158, 11, 0.3);
            box-shadow: 0 0 0px 0px #f59e0b;
            border-color: #ec3b19;
          }
          50% {
            text-shadow:
              0 0 20px rgba(245, 158, 11, 0.9),
              0 0 40px rgba(245, 158, 11, 0.7),
              0 0 60px rgba(245, 158, 11, 0.5);
            box-shadow: 0 0 32px 8px #f59e0b;
            border-color: #f59e0b;
          }
          100% {
            text-shadow:
              0 0 10px rgba(245, 158, 11, 0.7),
              0 0 20px rgba(245, 158, 11, 0.5),
              0 0 30px rgba(245, 158, 11, 0.3);
            box-shadow: 0 0 0px 0px #f59e0b;
            border-color: #ec3b19;
          }
        }

        @keyframes neonGlowCOMPLETED {
          0% {
            text-shadow:
              0 0 10px rgba(16, 185, 129, 0.7),
              0 0 20px rgba(16, 185, 129, 0.5),
              0 0 30px rgba(16, 185, 129, 0.3);
            box-shadow: 0 0 0px 0px #10b981;
            border-color: #10b981;
          }
          50% {
            text-shadow:
              0 0 20px rgba(16, 185, 129, 0.9),
              0 0 40px rgba(16, 185, 129, 0.7),
              0 0 60px rgba(16, 185, 129, 0.5);
            box-shadow: 0 0 32px 8px #10b981;
            border-color: #10b981;
          }
          100% {
            text-shadow:
              0 0 10px rgba(16, 185, 129, 0.7),
              0 0 20px rgba(16, 185, 129, 0.5),
              0 0 30px rgba(16, 185, 129, 0.3);
            box-shadow: 0 0 0px 0px #10b981;
            border-color: #10b981;
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

        .number-animation {
          display: inline-block;
        }

        .number-animation > span {
          display: inline-block;
          animation: numberAppear 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .neon-text-PAYED {
          animation: neonGlowPAYED 2s ease-in-out infinite;
          animation-duration: 10s;
        }

        .neon-text-COMPLETED {
          animation: neonGlowCOMPLETED 2s ease-in-out infinite;
          animation-duration: 10s;
        }

        .new-order-PAYED {
          animation: neonGlowPAYED 2s ease-in-out infinite;
          animation-duration: 10s;
        }
        .new-order-COMPLETED {
          animation: neonGlowCOMPLETED 2s ease-in-out infinite;
          animation-duration: 10s;
        }

        .order-card {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          font-variant-numeric: tabular-nums;
          box-sizing: border-box;
          flex-shrink: 0;
          font-weight: 800;
          border-radius: 1rem;
          border-width: 2px;
          pointer-events: none;
          user-select: none;
          transition:
            background-color 0.5s ease,
            color 0.5s ease,
            border-color 0.5s ease,
            box-shadow 0.5s ease;
        }
        .order-card-prep {
          width: calc(4ch + clamp(10px, 0.8vw, 16px) * 2);
          height: clamp(84px, 7vw, 132px);
          font-size: clamp(2.2rem, 4.4vw, 4.8rem);
          color: #fff;
          background: #ec3b19;
          border-color: #ec3b19;
        }
        .order-card-ready {
          width: calc(4ch + clamp(18px, 1.8vw, 36px) * 2);
          height: clamp(148px, 13.5vw, 236px);
          font-size: clamp(4rem, 8.2vw, 8.8rem);
          background: #153542;
          border-color: #153542;
          color: #fff;
        }
        .number-animation > span {
          font-size: clamp(4.2rem, 12.8vw, 14.8rem);
        }
        .number-animation {
          min-width: clamp(80px, 10vw, 200px);
        }
        .slide-in {
          animation: slideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) both;
        }
        @keyframes slideIn {
          0% {
            opacity: 0;
            transform: translateY(24px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .order-ready {
          background: #fff;
          color: #153542;
          border-color: #fff;
          animation:
            readyEnter 0.45s cubic-bezier(0.22, 1, 0.36, 1) both,
            readyGlow 2.8s ease-in-out 0.45s infinite;
        }
        @keyframes readyEnter {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes readyGlow {
          0%,
          100% {
            box-shadow: 0 8px 24px rgba(21, 53, 66, 0.18);
          }
          50% {
            box-shadow:
              0 0 0 4px rgba(255, 255, 255, 0.95),
              0 14px 36px rgba(21, 53, 66, 0.28);
          }
        }
        .prep-panel,
        .ready-panel {
          min-height: 0;
          border-radius: 1.25rem;
        }
        .prep-panel {
          background: white;
        }
        .ready-panel {
          background: #f8aa00;
        }
      `}</style>

      <div className="relative z-10 flex w-full shrink-0 items-center justify-center py-1 sm:py-2">
        <img
          className="h-[6vw] max-h-16 object-contain pointer-events-none"
          src={"/images/colored.svg"}
          alt="Logo"
          draggable="false"
        />
      </div>

      <div
        className={`relative z-10 flex min-h-0 w-full flex-1 gap-3 sm:gap-4 ${
          isPortrait ? "flex-col" : "flex-row"
        }`}
      >
        <section
          className={`prep-panel border-2 flex min-h-0 flex-col p-3 sm:p-4 ${
            isPortrait ? "order-2 flex-[0.72]" : "flex-[0.72]"
          }`}
        >
          <div className="mb-3 shrink-0">
            <p className="text-[clamp(1.1rem,1.8vw,1.6rem)] font-semibold tracking-wide text-gray-500">
              Bekleyen
            </p>
            <h2 className="text-[clamp(1.6rem,2.6vw,2.8rem)] font-extrabold leading-none text-[#EC3B19]">
              Hazırlanıyor
            </h2>
          </div>
          <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 content-start justify-items-center gap-2 overflow-hidden sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {preparingOrders.map((order, index) => (
              <span
                key={order.id}
                className={`order-card order-card-prep slide-in ${
                  isNewOrder(order) ? "new-order-PAYED" : ""
                }`}
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                {order.number || "N/A"}
              </span>
            ))}
          </div>
        </section>

        <section
          className={`ready-panel border-2 flex min-h-0 flex-col p-4 sm:p-5 ${
            isPortrait ? "order-1 flex-[1.35]" : "flex-[1.45]"
          }`}
        >
          <div className="mb-4 flex shrink-0 items-end justify-between gap-3">
            <div>
              <p className="text-[clamp(1.1rem,1.8vw,1.6rem)] font-semibold tracking-wide text-[#153542]/55">
                Siparişiniz hazır
              </p>
              <h2 className="text-[clamp(2rem,3.4vw,3.6rem)] font-extrabold leading-none text-[#153542]">
                Alabilirsiniz
              </h2>
            </div>
            {readyOrders.length > 0 && (
              <span className="rounded-full bg-[#153542] px-3 py-1 text-[clamp(1rem,1.6vw,1.35rem)] font-bold text-[#f8aa21]">
                {readyOrders.length}
              </span>
            )}
          </div>
          <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 content-start justify-items-center gap-3 overflow-visible sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
            {readyOrders.length === 0 ? (
              <p className="col-span-full pt-8 text-center text-[clamp(1.1rem,2vw,1.6rem)] font-bold text-[#153542]/30">
                Hazır sipariş bekleniyor
              </p>
            ) : (
              readyOrders.map((order, index) => {
                const isJustReady = !!recentlyCompletedGlow[order.id];
                return (
                  <span
                    key={order.id}
                    className={`order-card order-card-ready ${
                      isJustReady ? "order-ready" : "slide-in"
                    }`}
                    style={{
                      animationDelay: isJustReady ? "0s" : `${index * 0.06}s`,
                    }}
                  >
                    {order.number || "N/A"}
                  </span>
                );
              })
            )}
          </div>
        </section>
      </div>

      {!isSocketConnected && (
        <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-center py-2 z-[100] font-bold animate-pulse">
          Sunucu ile bağlantı kurulamadı. Tekrar bağlanıyor...
        </div>
      )}
    </div>
  );
}
