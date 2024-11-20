import React from "react";

interface NumericKeyboardProps {
  onKeyPress: (number: number) => void; // Tuşa basıldığında çalışacak fonksiyon
  onDelete: () => void; // Silme işlemi için fonksiyon
}

const NumericKeyboard: React.FC<NumericKeyboardProps> = ({
  onKeyPress,
  onDelete,
}) => {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="flex flex-col gap-6 justify-center rounded-3xl shadow-xl shadow-  mx-auto items-center p-4  ">
      <div className="gap-6 flex flex-row">
        {numbers.slice(0, 3).map((number) => (
          <button
            key={number}
            onClick={() => onKeyPress(number)}
            className="w-[78.67px] h-[78.67px]  px-[61px] py-[33px] bg-zinc-100 rounded-[30px] justify-center items-center gap-2.5 inline-flex"
          >
            <span className="text-black text-5xl font-medium ">{number}</span>
          </button>
        ))}
      </div>
      <div className="gap-6 flex flex-row">
        {numbers.slice(3, 6).map((number) => (
          <button
            key={number}
            onClick={() => onKeyPress(number)}
            className="w-[78.67px] h-[78.67px]  px-[61px] py-[33px] bg-zinc-100 rounded-[30px] justify-center items-center gap-2.5 inline-flex"
          >
            <span className="text-black text-5xl font-medium ">{number}</span>
          </button>
        ))}
      </div>
      <div className="gap-6 flex flex-row">
        {numbers.slice(6).map((number) => (
          <button
            key={number}
            onClick={() => onKeyPress(number)}
            className="w-[78.67px] h-[78.67px]  px-[61px] py-[33px] bg-zinc-100 rounded-[30px] justify-center items-center gap-2.5 inline-flex"
          >
            <span className="text-black text-5xl font-medium ">{number}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-row gap-6">
        <button
          onClick={onDelete}
          className="w-[192px] h-[78.67px] px-[61px] py-[33px] bg-zinc-100 rounded-[30px] justify-center items-center gap-2.5 inline-flex"
        >
          <img src="/images/delete.svg" alt="delete button" />
        </button>
        <button
          onClick={() => onKeyPress(0)}
          className="w-[192px] h-[78.67px] px-[61px] py-[33px] bg-zinc-100 rounded-[30px] justify-center items-center gap-2.5 inline-flex"
        >
          <span className="text-black text-5xl font-medium">0</span>
        </button>
      </div>
    </div>
  );
};

export default NumericKeyboard;
