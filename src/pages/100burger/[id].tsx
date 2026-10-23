import { useEffect, useState } from "react";
import Head from "next/head";
import { Jost } from "next/font/google";
import { io, Socket } from "socket.io-client";
import Confetti from "react-confetti";

const jost = Jost({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-jost",
});

// 100Burger renkleri
const YELLOW = "#F7C611";
const DARK = "#222222";
const CREAM = "#F3F2EE";

// Tasarım 1920x1080 üzerine kurulu, ekrana sığacak şekilde ölçekleniyor
const STAGE_W = 1920;
const STAGE_H = 1080;
const MAX_TILES = 10;

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

// Logo ve filigran, /public/100burger altındaki maske görsellerinden renklendirilir
const maskStyle = (src: string, color: string): React.CSSProperties => ({
  backgroundColor: color,
  WebkitMaskImage: `url(${src})`,
  maskImage: `url(${src})`,
  WebkitMaskSize: "100% 100%",
  maskSize: "100% 100%",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
});

function Logo({
  width,
  ink,
  one,
  style,
}: {
  width: number;
  ink: string;
  one: string;
  style?: React.CSSProperties;
}) {
  const height = (width * 300) / 340;
  return (
    <div className="absolute" style={{ width, height, ...style }}>
      <div
        className="absolute inset-0"
        style={maskStyle("/100burger/logo-yellow.png", one)}
      />
      <div
        className="absolute inset-0"
        style={maskStyle("/100burger/logo-dark.png", ink)}
      />
    </div>
  );
}

function Watermark({ color }: { color: string }) {
  return (
    <div
      className="absolute"
      style={{
        left: 1030,
        top: 270,
        width: 890,
        height: 810,
        ...maskStyle("/100burger/watermark.png", color),
      }}
    />
  );
}

function triangle(ctx: CanvasRenderingContext2D) {
  const r = 18 + Math.random() * 14;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r, r * 0.8);
  ctx.lineTo(-r * 0.9, r * 0.6);
  ctx.closePath();
  ctx.fill();
}

export default function YuzBurger() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [notification, setNotification] = useState<NewOrderNotification>({
    isVisible: false,
    order: null,
  });
  const [notificationQueue, setNotificationQueue] = useState<Order[]>([]);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(true);
  const [scale, setScale] = useState<number | null>(null);
  const [, setTick] = useState(0);

  const fetchOrders = async () => {
    try {
      const pathParts = window.location.pathname.split("/");
      const branchId = pathParts[pathParts.length - 1];
      const response = await fetch(
        `${process.env.NEXT_APP_API_URL}/api/customerScreen/branch/${branchId}`,
      );
      if (!response.ok) throw new Error("Veriler alınırken bir hata oluştu.");
      const data: Order[] = await response.json();
      setOrders(data.filter((order) => order.visible !== false));
    } catch (error) {
      console.error("[100Burger Sipariş Takip] Güncelleme başarısız:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    // süre filtreleri (60 dk / 5 dk) için ekranı düzenli yenile
    const tick = setInterval(() => setTick((t) => t + 1), 15000);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchOrders();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // 1920x1080 sahneyi ekrana oranlı sığdır
  useEffect(() => {
    const fit = () =>
      setScale(
        Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H),
      );
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // Kiosk modu: tam ekran, uyku engelleme, etkileşimsiz
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.body.style.overflow = "hidden";
    document.body.style.cursor = "none";
    document.body.style.background = CREAM;
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
    const onVisible = () => {
      if (document.visibilityState === "visible") requestWakeLock();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.body.style.overflow = "";
      document.body.style.cursor = "";
      document.body.style.background = "";
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("visibilitychange", onVisible);
      wakeLock?.release();
    };
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
    });
    socket.on("disconnect", () => setIsSocketConnected(false));
    socket.on("reconnect_attempt", () => setIsSocketConnected(false));
    socket.on("reconnect", () => {
      setIsSocketConnected(true);
      fetchOrders();
    });
    socket.on("newOrder", (order: Order) => {
      if (order.visible === false) return;
      setNotificationQueue((q) => [...q, order]);
      setOrders((prev) =>
        prev.some((o) => o.id === order.id) ? prev : [...prev, order],
      );
      fetchOrders();
    });
    socket.on("orderUpdated", (order: Order) => {
      if (order.visible === false) {
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        return;
      }
      setOrders((prev) => {
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

  const head = (
    <Head>
      <title>100Burger Sipariş Takip</title>
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
      />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta
        name="apple-mobile-web-app-status-bar-style"
        content="black-translucent"
      />
      <meta name="theme-color" content={CREAM} />
    </Head>
  );

  const stageStyle = (bg: string): React.CSSProperties => ({
    width: STAGE_W,
    height: STAGE_H,
    background: bg,
    transform: `translate(-50%, -50%) scale(${scale ?? 1})`,
    transformOrigin: "center center",
    left: "50%",
    top: "50%",
    visibility: scale === null ? "hidden" : "visible",
  });

  // ---- Yeni sipariş / hazır bildirimi (tam ekran) ----
  if (notification.isVisible && notification.order) {
    const isPreparing = notification.order.status === "PAYED";
    const bg = isPreparing ? YELLOW : DARK;
    const fg = isPreparing ? DARK : "#EFEBE4";
    const confettiColors = isPreparing
      ? ["#EFEBE4", "#F7F3EA", "#FFFFFF"]
      : [YELLOW, "#DDB017", "#F2C230"];

    return (
      <>
        {head}
        <div
          className={`${jost.variable} fixed inset-0 overflow-hidden font-[family-name:var(--font-jost)] select-none`}
          style={{ background: bg }}
        >
          <div className="absolute" style={stageStyle(bg)}>
            <Watermark color={isPreparing ? "#FFFFFF33" : "#FFFFFF0D"} />
            <div
              className="absolute left-0 right-0 text-center"
              style={{ top: 268, color: fg }}
            >
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 400,
                  letterSpacing: "0.12em",
                  lineHeight: 1,
                }}
              >
                SİPARİŞİNİZ
              </div>
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  lineHeight: 1.25,
                }}
              >
                {isPreparing ? "HAZIRLANIYOR" : "HAZIR!"}
              </div>
            </div>
            <div
              className="stamp absolute left-0 right-0 text-center tabular-nums"
              style={{
                top: 400,
                color: fg,
                fontSize: 380,
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              {notification.order.number}
            </div>
            <Logo
              width={190}
              ink={fg}
              one={isPreparing ? DARK : YELLOW}
              style={{ left: 865, top: 790 }}
            />
          </div>
          <Confetti
            recycle={false}
            numberOfPieces={90}
            gravity={0.12}
            colors={confettiColors}
            drawShape={triangle}
          />
          <style jsx>{`
            @keyframes stamp {
              0% {
                transform: scale(1.8);
                opacity: 0;
              }
              60% {
                transform: scale(0.96);
                opacity: 1;
              }
              100% {
                transform: scale(1);
              }
            }
            .stamp {
              animation: stamp 0.5s cubic-bezier(0.22, 1.2, 0.36, 1) both;
            }
          `}</style>
        </div>
      </>
    );
  }

  // ---- Ana ekran ----
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
    .slice(0, MAX_TILES);

  const readyOrders = orders
    .filter((order) => {
      if (order.status !== "COMPLETED") return false;
      const diffMinutes =
        (Date.now() - new Date(order.updatedAt).getTime()) / 60000;
      return diffMinutes <= 5;
    })
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, MAX_TILES);

  const grid = (list: Order[], top: number, tileBg: string, tileFg: string) => (
    <div
      className="absolute grid"
      style={{
        left: 590,
        top,
        width: 1218,
        gridTemplateColumns: "repeat(5, 1fr)",
        columnGap: 20,
        rowGap: 18,
      }}
    >
      {list.map((order, index) => (
        <div
          key={order.id}
          className="tile flex items-center justify-center tabular-nums "
          style={{
            height: 115,
            borderRadius: 12,
            background: tileBg,
            color: tileFg,
            fontSize: 58,
            fontWeight: 700,
            animationDelay: `${index * 0.06}s`,
          }}
        >
          {order.number}
        </div>
      ))}
    </div>
  );

  const sectionTitle = (text: string, top: number) => (
    <>
      <div
        className="absolute"
        style={{
          left: 590,
          top,
          fontSize: 56,
          fontWeight: 500,
          color: DARK,
          lineHeight: 1,
          letterSpacing: "-0.01em",
        }}
      >
        {text}
      </div>
      <div
        className="absolute"
        style={{
          left: 590,
          top: top + 78,
          width: 1218,
          height: 2,
          background: DARK,
        }}
      />
    </>
  );

  return (
    <>
      {head}
      <div
        className={`${jost.variable} fixed inset-0 overflow-hidden font-[family-name:var(--font-jost)] select-none`}
        style={{ background: CREAM }}
      >
        <style jsx>{`
          @keyframes tile-in {
            0% {
              transform: scale(0.7);
              opacity: 0;
            }
            70% {
              transform: scale(1.04);
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
          .tile {
            animation: tile-in 0.4s cubic-bezier(0.34, 1.4, 0.64, 1) both;
          }
        `}</style>

        <div className="absolute" style={stageStyle(CREAM)}>
          <Watermark color="#E9E7E0" />
          <Logo
            width={340}
            ink={DARK}
            one={YELLOW}
            style={{ left: 130, top: 390 }}
          />

          {sectionTitle("Siparişiniz Hazırlanıyor", 124)}
          {grid(preparingOrders, 238, YELLOW, DARK)}

          {sectionTitle("Siparişiniz Hazır, Afiyet Olsun!", 586)}
          {grid(readyOrders, 694, DARK, CREAM)}
        </div>

        {!isSocketConnected && (
          <div
            className="fixed bottom-0 left-0 right-0 py-2 text-center text-sm font-semibold uppercase tracking-widest"
            style={{ background: DARK, color: YELLOW, zIndex: 100 }}
          >
            bağlantı koptu — yeniden bağlanıyor
          </div>
        )}
      </div>
    </>
  );
}
