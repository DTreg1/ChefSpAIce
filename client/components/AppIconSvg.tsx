import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, G, Rect } from "react-native-svg";

interface AppIconSvgProps {
  size?: number;
  showBackground?: boolean;
  backgroundColors?: [string, string];
}

export function AppIconSvg({ 
  size = 200, 
  showBackground = false,
  backgroundColors = ["#1a5c3a", "#4ade80"]
}: AppIconSvgProps) {
  const scale = size / 100;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={backgroundColors[0]} />
          <Stop offset="100%" stopColor={backgroundColors[1]} />
        </LinearGradient>
        <LinearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <Stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0.25)" />
        </LinearGradient>
        <LinearGradient id="glassStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0.3)" />
        </LinearGradient>
        <LinearGradient id="bubbleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
        </LinearGradient>
        <LinearGradient id="circuitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
        </LinearGradient>
      </Defs>
      
      {showBackground && (
        <Rect x="0" y="0" width="100" height="100" rx="22" fill="url(#bgGradient)" />
      )}
      
      <G transform="translate(20, 18) scale(2.5)">
        <Path
          d="M12.5,1.5C10.73,1.5 9.17,2.67 8.68,4.3C6.55,4.96 5,6.95 5,9.36V19H20V9.36C20,6.95 18.45,4.96 16.32,4.3C15.83,2.67 14.27,1.5 12.5,1.5M9,11A1,1 0 0,1 10,12A1,1 0 0,1 9,13A1,1 0 0,1 8,12A1,1 0 0,1 9,11M16,11A1,1 0 0,1 17,12A1,1 0 0,1 16,13A1,1 0 0,1 15,12A1,1 0 0,1 16,11M11,14H14V15H11V14M7,17H18V18H7V17Z"
          fill="url(#glassGradient)"
          stroke="url(#glassStroke)"
          strokeWidth="0.4"
        />
      </G>
      
      <Circle cx="18" cy="25" r="4" fill="url(#bubbleGradient)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
      <Circle cx="82" cy="30" r="5" fill="url(#bubbleGradient)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
      <Circle cx="25" cy="75" r="3.5" fill="url(#bubbleGradient)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
      <Circle cx="78" cy="72" r="4.5" fill="url(#bubbleGradient)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
      <Circle cx="15" cy="50" r="2.5" fill="url(#bubbleGradient)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
      <Circle cx="88" cy="55" r="3" fill="url(#bubbleGradient)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
      
      <G stroke="url(#circuitGradient)" strokeWidth="1.2" fill="none">
        <Line x1="75" y1="35" x2="88" y2="22" />
        <Circle cx="88" cy="22" r="2.5" fill="url(#circuitGradient)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
        
        <Line x1="25" y1="40" x2="12" y2="35" />
        <Circle cx="12" cy="35" r="2" fill="url(#circuitGradient)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
        
        <Line x1="70" y1="70" x2="85" y2="82" />
        <Circle cx="85" cy="82" r="2.5" fill="url(#circuitGradient)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
        
        <Line x1="30" y1="68" x2="18" y2="80" />
        <Circle cx="18" cy="80" r="2" fill="url(#circuitGradient)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
      </G>
    </Svg>
  );
}

export default AppIconSvg;
