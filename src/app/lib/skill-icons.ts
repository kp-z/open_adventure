import imgSportsperson2 from "figma:asset/8e6246622a3010a74ea17fb0d2b859534794a9c1.png";
import imgSportsperson1 from "figma:asset/5d5bd65c56561e3acf3e6b4bbed9603761bbff18.png";
import imgTrophy from "figma:asset/d11e4958f33acefcc81aa449f391a8b43def3a94.png";
import imgTableTennis from "figma:asset/afe3832aaf5c7da1dfc7884cd60482a9ec8bc265.png";
import imgSportsBottle from "figma:asset/232b336899aeaed887fa4440ddcb4951460430a2.png";
import imgHockey from "figma:asset/4468d02e077947bb751f0f2e37a33f94d1b3a5bf.png";
import imgRugby from "figma:asset/15e45d15490cbdc4bf0c65f847f3ee613ea17c56.png";
import imgGymming from "figma:asset/f1e7bc6be43099eafc29580ca83eff26a8c6be7e.png";
import imgEsports from "figma:asset/46c7531e4886b7b49890d99d64d86e9ce62c198a.png";
import imgBoxing from "figma:asset/69854609ac109f85850d39152088242db449c6b0.png";
import imgChess from "figma:asset/3c8faa844016920fbb106c9b823c30986cc692ea.png";
import imgCricket from "figma:asset/97329c53d41a662a98585ab7ddbac259141d3347.png";
import imgBaseball from "figma:asset/80a46f02cfbcf8edd74e3aa326e80669c17ee8f2.png";
import imgWistle2 from "figma:asset/b71d8c707dca314d8f144e72092116f9fc18e225.png";
import imgStopwatch from "figma:asset/b2ddf4861c4074997e2faf2af1e8439599b21443.png";
import imgSwimming from "figma:asset/44e80c24760df9af04d5a2e5a2ff54d61743d28a.png";
import imgTennis from "figma:asset/f8bc97cdde43aaeecc58521d536f71b9ac31ee53.png";
import imgBadminton from "figma:asset/1c66f0f8390ae61753397aa926714cafc336f91e.png";
import imgBasketball from "figma:asset/a46803fabfc97a3c36318a7c83b3455ddcaf33f1.png";
import imgFootball from "figma:asset/96d7e1d7881777c38d7e6d11f01afc44b3bfb2d6.png";

export const skillIcons = {
  sportsperson2: imgSportsperson2,
  sportsperson1: imgSportsperson1,
  trophy: imgTrophy,
  tableTennis: imgTableTennis,
  sportsBottle: imgSportsBottle,
  hockey: imgHockey,
  rugby: imgRugby,
  gymming: imgGymming,
  esports: imgEsports,
  boxing: imgBoxing,
  chess: imgChess,
  cricket: imgCricket,
  baseball: imgBaseball,
  whistle: imgWistle2,
  stopwatch: imgStopwatch,
  swimming: imgSwimming,
  tennis: imgTennis,
  badminton: imgBadminton,
  basketball: imgBasketball,
  football: imgFootball,
};

export const getSkillIcon = (key: string) => {
  return (skillIcons as any)[key] || imgTrophy;
};
