import React, { useEffect, useState } from "react";
import Confetti from "react-confetti";

function ConfettiComponent() {
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [isClient, setClient] = useState(false);
  useEffect(() => {
    const { innerWidth: width, innerHeight: height } = window;
    setDimensions({
      width,
      height,
    });
    setClient(true);
  }, []);
  return (
    <div>
      {isClient && (
        <Confetti
          width={dimensions.width}
          height={dimensions.height}
          recycle={false}
        />
      )}
    </div>
  );
}

export default ConfettiComponent;
