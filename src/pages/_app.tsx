import { ReactElement, ReactNode } from "react";
import { Transition } from "@headlessui/react";
import { NextPage } from "next";
import type { AppProps } from "next/app";
import Head from "next/head";
import { ToastIcon, Toaster, resolveValue } from "react-hot-toast";

import "@/styles/globals.css";

export type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

const TailwindToaster = () => {
  return (
    <Toaster
      toastOptions={{
        duration: 3000,
        success: {
          iconTheme: {
            primary: "#00D8A7",
            secondary: "white",
          },
        },
        error: {
          iconTheme: {
            primary: "#FF6463",
            secondary: "white",
          },
        },
      }}
      position="top-right"
    >
      {(t) => (
        <Transition
          appear
          show={t.visible}
          enter="transition-all duration-150"
          enterFrom="opacity-0 scale-50"
          enterTo="opacity-100 scale-100"
          leave="transition-all duration-150"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-75"
        >
          <div
            className={`transform pl-3 pr-4 py-2.5 flex items-center bg-white border-l-[4px] rounded shadow-container ${
              t.type === "success"
                ? "border-brand-green-primary"
                : t.type === "error"
                ? "border-brand-red-primary"
                : "border-brand-black-light"
            }`}
          >
            <ToastIcon toast={t} />
            <p className="ml-2.5 text-black">{resolveValue(t.message, t)}</p>
          </div>
        </Transition>
      )}
    </Toaster>
  );
};

function MyApp({ Component, pageProps }: AppPropsWithLayout) {
  const getLayout = Component.getLayout ?? ((page) => page);
  return (
    <>
      <Head>
        <title>Regeditpos - Kiosk</title>
        <link rel="icon" href="/favicon.ico" />
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, maximum-scale=1" />
      </Head>
      <TailwindToaster />
      {getLayout(<Component {...pageProps} />)}
    </>
  );
}

export default MyApp;
