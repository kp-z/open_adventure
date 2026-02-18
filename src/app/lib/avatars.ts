import imgAvatar1 from "figma:asset/4344bceb6d2427d3cd55c95b42163277c8aa7d0b.png";
import imgAvatar2 from "figma:asset/c14446abc4ad8d4eea24260712b7ce264ed283de.png";
import imgAvatar3 from "figma:asset/d735af913d233f758c5f0d481dca63a9b92ec0c0.png";
import imgAvatar4 from "figma:asset/ac42bc2243842b144e86351c32dae20ee4a18bcc.png";
import imgAvatar5 from "figma:asset/d8633a922d9eb5694199bfc92ee060c5aefd88b8.png";
import imgAvatar6 from "figma:asset/8d472c9b56b8b8267d8b026701b86291d068a87e.png";
import imgAvatar7 from "figma:asset/3c8d1c0e302cb16330f866e30689725dbb18c9dd.png";
import imgAvatar8 from "figma:asset/4dd412ae78096ed1c65d9291d5d3d2aaf4f6f87f.png";
import imgAvatar9 from "figma:asset/e277891e17376e09628ddbb360f17a674731c086.png";
import imgAvatar10 from "figma:asset/5149d4b1c5f25e04c1e3f9c54c84aed74763a44f.png";
import imgAvatar11 from "figma:asset/991348e1c591f24014fcc2f1215d47984442d440.png";
import imgAvatar12 from "figma:asset/af8547f094edc2d42cc08992bfe7cde2c4d9b8f9.png";

export const heroAvatars = [
  { id: 'vanguard_1', name: 'Elite Guardian', img: imgAvatar1, rarity: 'rare' },
  { id: 'vanguard_2', name: 'Cyber Rogue', img: imgAvatar2, rarity: 'rare' },
  { id: 'vanguard_3', name: 'Neo Sage', img: imgAvatar3, rarity: 'legendary' },
  { id: 'vanguard_4', name: 'Tech Weaver', img: imgAvatar4, rarity: 'epic' },
  { id: 'vanguard_5', name: 'Data Sentinel', img: imgAvatar5, rarity: 'epic' },
  { id: 'vanguard_6', name: 'Bit Paladin', img: imgAvatar6, rarity: 'legendary' },
  { id: 'vanguard_7', name: 'Cloud Oracle', img: imgAvatar7, rarity: 'legendary' },
  { id: 'vanguard_8', name: 'Script Assassin', img: imgAvatar8, rarity: 'epic' },
  { id: 'vanguard_9', name: 'Flux Warden', img: imgAvatar9, rarity: 'epic' },
  { id: 'vanguard_10', name: 'Kernel Knight', img: imgAvatar10, rarity: 'legendary' },
  { id: 'vanguard_11', name: 'Macro Mage', img: imgAvatar11, rarity: 'epic' },
  { id: 'vanguard_12', name: 'Logic Lord', img: imgAvatar12, rarity: 'legendary' },
];

export const getRandomAvatar = () => {
  return heroAvatars[Math.floor(Math.random() * heroAvatars.length)];
};

export const getAvatarById = (id: string) => {
  return heroAvatars.find(a => a.id === id) || heroAvatars[0];
};
