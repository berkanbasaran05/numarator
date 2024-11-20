import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import NumericKeyboard from "../components/Keyboard/NumericKeyboard";

export default function Home() {
  const [password, setPassword] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [number, setNumber] = useState(""); // 'number' alanı için state
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal durumu için state

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
      toast.error("Yanlış şifre! Lütfen tekrar deneyin.");
      setInputPassword(""); // Yanlış girişte şifre alanını sıfırla
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
        toast.success("Sipariş numarası başarıyla gönderildi!");
        setNumber("");
      } else {
        toast.error("Gönderme isteğinde bir hata oluştu.");
      }
    } catch (error) {
      console.error("POST isteği hatası:", error);
      toast.error("Bir hata oluştu.");
    }
  };

  const handleDelete = async () => {
    setIsModalOpen(false); // Modal'ı kapat
    try {
      const response = await fetch(
        `${process.env.NEXT_APP_API_URL}/api/order/delete/AllCustomerOrderNo`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.ok) {
        console.log("Tüm sipariş numaraları temizlendi.");
        toast.success("Tüm sipariş numaraları başarıyla temizlendi!");
      } else {
        toast.error("Sipariş numaraları temizlenirken bir hata oluştu.");
      }
    } catch (error) {
      console.error("Silme isteği hatası:", error);
      toast.error("Bir hata oluştu.");
    }
  };

  // Numeric Keyboard işlevleri (Sipariş Numarası için)
  const handleNumberKeyPress = (digit: any) => {
    if (number.length < 5) {
      setNumber((prev) => prev + digit.toString());
    }
  };

  const handleNumberDeleteKey = () => {
    setNumber((prev) => prev.slice(0, -1));
  };

  // Numeric Keyboard işlevleri (Şifre için)
  const handlePasswordKeyPress = (digit: any) => {
    if (inputPassword.length < 6) {
      setInputPassword((prev) => prev + digit.toString());
    }
  };

  const handlePasswordDeleteKey = () => {
    setInputPassword((prev) => prev.slice(0, -1));
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center  overflow-hidden overscroll-y-none justify-center min-h-screen">
        <div className="w-full items-center justify-center h-36 flex flex-row ">
          <img
            className="w-[550px] object-cover"
            src={"/images/greenlogo.png"}
            alt="Logo"
          />
        </div>
        <h1 className="text-3xl font-bold ">Şifre Girin</h1>
        <div className="text-3xl font-semibold mb-4">
          {inputPassword.replace(/./g, "*") || "-"}
        </div>
        <NumericKeyboard
          onKeyPress={handlePasswordKeyPress}
          onDelete={handlePasswordDeleteKey}
        />
        <button
          onClick={handleLogin}
          className="mt-4 px-12 py-2 w-[400px] bg-zinc-100 text-black font-semibold h-16 text-2xl rounded-xl "
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

      <div className="flex flex-row items-center space-x-12 mt-4">
        <h1 className="text-2xl font-bold">Sipariş Numarası Gir</h1>
      </div>
      <div className="text-3xl font-semibold">{number || "-"}</div>
      <NumericKeyboard
        onKeyPress={handleNumberKeyPress}
        onDelete={handleNumberDeleteKey}
      />
      <button
        onClick={handlePostRequest}
        className="mt-4 px-12 py-2 w-[400px] bg-zinc-100 text-black font-semibold h-16 text-2xl rounded-xl "
      >
        Gönder
      </button>

      <button
        onClick={() => setIsModalOpen(true)}
        className="text-red-500 mt-12 px-12 py-2 bg-red-100 flex flex-row items-center gap-4 hover:bg-red-300 rounded"
      >
        <img className="w-8 h-8 " src="/images/blacktrash.svg" />
        Sipariş Numaralarını Temizle
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-8 rounded-lg items-center flex flex-col shadow-lg">
            <h2 className="text-xl text-red-500 font-bold mb-4">
              Emin misiniz? Tüm sipariş numaralarını temizlemek istiyorsunuz.
            </h2>
            <div className="flex space-x-4">
              <button
                onClick={handleDelete}
                className="px-6 py-2 bg-green-500 text-white rounded "
              >
                Evet
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 bg-red-500 rounded "
              >
                Hayır
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
