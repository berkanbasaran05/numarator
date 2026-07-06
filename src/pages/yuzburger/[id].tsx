import { useEffect, useState, useRef } from "react";
import Head from "next/head";
import localFont from "next/font/local";
import { Nunito } from "next/font/google";
import { io, Socket } from "socket.io-client";
import Confetti from "react-confetti";

// Fontları tanımlama
const geistSans = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Nunito font tanımı
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

// Order tipi
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
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(true);
  const [recentlyCompletedGlow, setRecentlyCompletedGlow] = useState<
    Record<number, boolean>
  >({});
  const newOrderSoundRef = useRef<HTMLAudioElement | null>(null);

  // İlk yüklemede API'den siparişleri çek

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

  // Kiosk modu: tam ekran, uyku engelleme, etkileşimsiz
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.body.style.overflow = "hidden";
    document.body.style.cursor = "none";
    document.addEventListener("contextmenu", prevent);

    let wakeLock: WakeLockSentinel | null = null;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch {}
    };
    requestWakeLock();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") requestWakeLock();
    });

    return () => {
      document.body.style.overflow = "";
      document.body.style.cursor = "";
      document.removeEventListener("contextmenu", prevent);
      wakeLock?.release();
    };
  }, []);

  // Yeni sipariş sesi için audio nesnesini hazırla
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!newOrderSoundRef.current) {
      // /public/sounds/new-order.mp3 yoluna uygun bir ses dosyası koymalısın
      newOrderSoundRef.current = new Audio("/sounds/new-order.mp3");
      newOrderSoundRef.current.volume = 1;
    }
  }, []);

  // Kuyruktan sıradaki bildirimi göster
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

  // --- SOCKET.IO ---
  useEffect(() => {
    // URL'den branchId'yi al
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

  // Yeni sipariş kontrolü (grid animasyonu için)
  const isNewOrder = (order: Order) => {
    return !prevOrders.find((prevOrder) => prevOrder.id === order.id);
  };

  // COMPLETED'a yeni düşen siparişler için 30 sn neon border animasyonu
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

  if (notification.isVisible && notification.order) {
    const isPreparing = notification.order.status === "PAYED";
    return (
      <div
        className={`${geistMono.variable} fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden font-[family-name:var(--font-geist-mono)] ${
          isPreparing ? "bg-[#EC3B19]" : "bg-[#F8AA21]"
        }`}
      >
        {isPreparing && <Confetti recycle={false} numberOfPieces={120} />}
        <style jsx>{`
          @keyframes stamp {
            0% {
              transform: scale(2.2) rotate(-8deg);
              opacity: 0;
            }
            55% {
              transform: scale(0.92) rotate(2deg);
              opacity: 1;
            }
            75% {
              transform: scale(1.04) rotate(-1deg);
            }
            100% {
              transform: scale(1) rotate(0deg);
            }
          }
          @keyframes wiggle {
            0%,
            100% {
              transform: rotate(-2deg);
            }
            50% {
              transform: rotate(2deg);
            }
          }
          .stamp-num {
            animation: stamp 0.55s cubic-bezier(0.22, 1.2, 0.36, 1) forwards;
          }
          .wiggle-label {
            animation: wiggle 0.4s ease-in-out 0.5s 3;
          }
        `}</style>

        <p
          className={`wiggle-label mb-2 text-[clamp(2rem,5vw,4rem)] font-black uppercase tracking-tighter ${
            isPreparing ? "text-white" : "text-[#1a1000]"
          }`}
        >
          {isPreparing ? "Sıran Geliyor" : "Teslim Al!"}
        </p>

        <div
          className="stamp-num relative bg-white px-[clamp(2rem,6vw,5rem)] py-[clamp(1.5rem,4vw,3rem)]"
          style={{
            boxShadow: "8px 8px 0 #1a1000",
            clipPath:
              "polygon(0% 8%, 4% 0%, 8% 8%, 12% 0%, 16% 8%, 20% 0%, 24% 8%, 28% 0%, 32% 8%, 36% 0%, 40% 8%, 44% 0%, 48% 8%, 52% 0%, 56% 8%, 60% 0%, 64% 8%, 68% 0%, 72% 8%, 76% 0%, 80% 8%, 84% 0%, 88% 8%, 92% 0%, 96% 8%, 100% 0%, 100% 100%, 0% 100%)",
          }}
        >
          <span
            className="block font-black leading-none text-[#1a1000] tabular-nums"
            style={{ fontSize: "clamp(6rem, 22vw, 16rem)" }}
          >
            {notification.order.number}
          </span>
          <div
            className={`absolute bottom-3 left-0 right-0 text-center text-sm font-bold uppercase tracking-[0.4em] ${
              isPreparing ? "text-[#EC3B19]" : "text-[#F8AA21]"
            }`}
          >
            no
          </div>
        </div>

        <img
          src="/images/colored.svg"
          alt=""
          className="absolute bottom-8 right-8 h-14 opacity-40 invert"
          style={{ filter: isPreparing ? "invert(1)" : "none" }}
        />
      </div>
    );
  }

  const preparingOrders = orders
    .filter((order) => {
      if (order.status !== "PAYED") return false;
      const diffMinutes =
        (Date.now() - new Date(order.createdAt).getTime()) / 60000;
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
        (Date.now() - new Date(order.updatedAt).getTime()) / 60000;
      return diffMinutes <= 5;
    })
    .slice(0, 12);

  return (
    <>
      <Head>
        <title>Yüzburger Sipariş Takip</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#153542" />
      </Head>
    <div
      className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} relative flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#153542] font-[family-name:var(--font-nunito)] select-none touch-none`}
    >
      <style jsx>{`
        @keyframes ticket-drop {
          0% {
            transform: translateY(-30px) rotate(-3deg);
            opacity: 0;
          }
          60% {
            transform: translateY(4px) rotate(1deg);
          }
          100% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
        }
        @keyframes ready-blink {
          0%,
          100% {
            box-shadow: 6px 6px 0 #1a1000;
          }
          50% {
            box-shadow:
              6px 6px 0 #1a1000,
              0 0 0 4px #f8aa21;
          }
        }
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .ticket {
          animation: ticket-drop 0.4s cubic-bezier(0.34, 1.4, 0.64, 1) both;
        }
        .ticket-hot {
          animation: ready-blink 1s ease-in-out infinite;
        }
        .marquee-track {
          animation: marquee 18s linear infinite;
        }
        .halftone {
          background-image: radial-gradient(
            circle,
            rgba(0, 0, 0, 0.18) 1px,
            transparent 1px
          );
          background-size: 8px 8px;
        }
      `}</style>

      <header className="relative z-20 flex shrink-0 items-stretch border-b-4 border-[#1a1000] bg-white">
        <div className="flex items-center border-r-4 border-[#1a1000] bg-[#EC3B19] px-6 py-3">
          <img
            src="/images/colored.svg"
            alt="Yüzburger"
            className="h-10 w-auto brightness-0 invert"
            draggable="false"
          />
        </div>
        <div className="halftone flex flex-1 items-center overflow-hidden bg-[#F8AA21]">
          <div className="marquee-track flex whitespace-nowrap">
            {[0, 1].map((i) => (
              <span
                key={i}
                className="px-8 text-[clamp(1rem,2vw,1.6rem)] font-black uppercase tracking-widest text-[#1a1000]"
              >
                Siparişini takip et &nbsp;•&nbsp; Hazır olunca al
                &nbsp;•&nbsp; Afiyet olsun &nbsp;•&nbsp;
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 overflow-hidden">
        <section className="flex w-1/2 flex-col border-r-4 border-[#1a1000] bg-[#EC3B19]">
          <div className="border-b-4 border-[#1a1000] bg-[#1a1000] px-5 py-3">
            <h2 className="text-[clamp(1.4rem,2.8vw,2.8rem)] font-black uppercase tracking-tight text-white">
              Hazırlanıyor
            </h2>
          </div>
          <div className="halftone flex flex-1 flex-wrap content-start gap-3 overflow-hidden p-4 sm:gap-4 sm:p-5">
            {preparingOrders.length === 0 ? (
              <p className="w-full pt-10 text-center text-xl font-bold text-white/30">
                bekleniyor...
              </p>
            ) : (
              preparingOrders.map((order, index) => (
                <div
                  key={order.id}
                  className={`ticket flex min-w-[calc(4ch+2rem)] items-center justify-center bg-white px-4 py-3 font-[family-name:var(--font-geist-mono)] font-black tabular-nums text-[#1a1000] ${
                    isNewOrder(order) ? "ticket-hot" : ""
                  }`}
                  style={{
                    fontSize: "clamp(3rem, 5.5vw, 6rem)",
                    boxShadow: "5px 5px 0 #1a1000",
                    animationDelay: `${index * 0.07}s`,
                    clipPath:
                      "polygon(0% 10%, 5% 0%, 10% 10%, 15% 0%, 20% 10%, 25% 0%, 30% 10%, 35% 0%, 40% 10%, 45% 0%, 50% 10%, 55% 0%, 60% 10%, 65% 0%, 70% 10%, 75% 0%, 80% 10%, 85% 0%, 90% 10%, 95% 0%, 100% 10%, 100% 100%, 0% 100%)",
                  }}
                >
                  {order.number}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="flex w-1/2 flex-col bg-[#F8AA21]">
          <div className="border-b-4 border-[#1a1000] bg-[#1a1000] px-5 py-3">
            <h2 className="text-[clamp(1.4rem,2.8vw,2.8rem)] font-black uppercase tracking-tight text-[#F8AA21]">
              Hazırlandı — Al!
            </h2>
          </div>
          <div className="halftone flex flex-1 flex-wrap content-start gap-3 overflow-hidden p-4 sm:gap-4 sm:p-5">
            {readyOrders.length === 0 ? (
              <p className="w-full pt-10 text-center text-xl font-bold text-[#1a1000]/25">
                henüz yok
              </p>
            ) : (
              readyOrders.map((order, index) => (
                <div
                  key={order.id}
                  className={`ticket flex min-w-[calc(4ch+2rem)] items-center justify-center bg-white px-4 py-3 font-[family-name:var(--font-geist-mono)] font-black tabular-nums text-[#1a1000] ${
                    recentlyCompletedGlow[order.id] || isNewOrder(order)
                      ? "ticket-hot"
                      : ""
                  }`}
                  style={{
                    fontSize: "clamp(3rem, 5.5vw, 6rem)",
                    boxShadow: "5px 5px 0 #1a1000",
                    animationDelay: `${index * 0.07}s`,
                    clipPath:
                      "polygon(0% 10%, 5% 0%, 10% 10%, 15% 0%, 20% 10%, 25% 0%, 30% 10%, 35% 0%, 40% 10%, 45% 0%, 50% 10%, 55% 0%, 60% 10%, 65% 0%, 70% 10%, 75% 0%, 80% 10%, 85% 0%, 90% 10%, 95% 0%, 100% 10%, 100% 100%, 0% 100%)",
                  }}
                >
                  {order.number}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {!isSocketConnected && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] border-t-4 border-[#1a1000] bg-[#1a1000] py-2 text-center text-sm font-black uppercase tracking-widest text-[#EC3B19]">
          ■ bağlantı koptu — yeniden bağlanıyor ■
        </div>
      )}
    </div>
    </>
  );
}
