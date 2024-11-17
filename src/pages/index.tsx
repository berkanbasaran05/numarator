import { useState, useEffect } from "react";

export default function Home() {
  const [password, setPassword] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [number, setNumber] = useState(""); // 'number' alanı için state

  // Türkiye saatine göre şifre hesaplama fonksiyonu
  const calculatePassword = () => {
    const now = new Date();
    const turkishTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
    );

    const hours = turkishTime.getHours().toString().padStart(2, "0");
    const minutes = turkishTime.getMinutes().toString().padStart(2, "0");

    const reversedHours = hours.split("").reverse().join("");
    const reversedMinutes = minutes.split("").reverse().join("");

    return `${reversedMinutes}${reversedHours}`;
  };

  // Şifreyi yükle
  useEffect(() => {
    const generatedPassword = calculatePassword();
    setPassword(generatedPassword);
    localStorage.setItem("accessPassword", generatedPassword);
  }, []);

  const handleLogin = () => {
    if (inputPassword === password) {
      setIsAuthenticated(true);
    } else {
      alert("Yanlış şifre! Lütfen tekrar deneyin.");
    }
  };

  const handlePostRequest = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_APP_API_URL}/api/order/createCustomerOrderNo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ number }), // 'number' alanı gönderiliyor
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("POST isteği sonucu:", result);
        alert("Veri başarıyla gönderildi!");
      } else {
        alert("POST isteğinde bir hata oluştu.");
      }
    } catch (error) {
      console.error("POST isteği hatası:", error);
      alert("Bir hata oluştu.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-full items-center justify-center h-36 flex flex-row ">
          <img
            className="w-[550px] object-cover"
            src={"/images/greenlogo.png"}
            alt="Logo"
          />
        </div>
        <h1 className="text-2xl font-bold">Şifre Girin</h1>
        <input
          type="password"
          value={inputPassword}
          onChange={(e) => setInputPassword(e.target.value)}
          placeholder="Şifre"
          className="mt-4 p-2 border rounded text-black w-1/2"
        />
        <button
          onClick={handleLogin}
          className="mt-4 px-12 py-2 w-1/2 bg-green-500 text-white rounded"
        >
          Giriş Yap
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-full items-center justify-center h-36 flex flex-row ">
        <img
          className="w-[550px] object-cover"
          src={"/images/greenlogo.png"}
          alt="Logo"
        />
      </div>
      <h1 className="text-2xl font-bold">Sipariş Numarası Gir</h1>
      <input
        type="text"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        placeholder="Sipariş Numarası"
        className="mt-4 p-2 text-black border-2 border-green-700 rounded w-1/2"
      />
      <button
        onClick={handlePostRequest}
        className="mt-4 px-12 py-2 w-1/2 bg-green-500 text-white rounded"
      >
        Gönder
      </button>
    </div>
  );
}
