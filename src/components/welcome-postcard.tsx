import Image from "next/image";
import { Delius, Josefin_Slab, Petit_Formal_Script } from "next/font/google";
import styles from "./welcome-postcard.module.css";

const print = Delius({ weight: "400", subsets: ["latin"], variable: "--postcard-print", display: "swap" });
const heading = Josefin_Slab({ weight: "500", subsets: ["latin"], variable: "--postcard-heading", display: "swap" });
const script = Petit_Formal_Script({ weight: "400", subsets: ["latin"], variable: "--postcard-script", display: "swap" });

export function WelcomePostcard() {
  return (
    <section className={`${styles.welcome} ${print.variable} ${heading.variable} ${script.variable}`} aria-label="Welcome postcard">
      <div className={styles.photo}>
        <Image src="/images/split-rock-postcard.png" width={2064} height={2620}
          alt="Visitors atop Split Rock at Lake Harmony in Pennsylvania's Pocono Mountains."
          className={styles.photoImage} sizes="(max-width: 1024px) 100vw, 50vw" preload />
      </div>
      <div className={styles.back}>
        <div className={styles.paper} aria-hidden="true" />
        <p className={styles.caption}>
          Lorem ipsum dolor sit amet, consectetur adipiscing.<br />
          Sed do eiusmod tempor incididunt ut labore et dolore.
        </p>
        <p className={styles.publisher}>
          <strong>Lorem</strong>{" "}ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.
        </p>
        <div className={styles.stamp} aria-label="Lorem ipsum dolor">
          <span>LOREM</span><span>IPSUM<br />DOLOR</span>
        </div>
        <h2 className={styles.title}>LOREM IPSUM</h2>
        <p className={styles.address}>Lorem</p>
        <p className={styles.footer}>Lorem ipsum dolor sit amet, consectetur.</p>
        <p className={styles.edition}>IPSUM</p>
      </div>
    </section>
  );
}
