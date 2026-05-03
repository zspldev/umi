export function SplashScreen() {
  const navy = "#0E1729";
  const amber = "#F59E0B";
  const mutedFg = "#94A3B8";
  const domain = "1201c571-c9f2-4e45-8bcf-f648e5787b31-00-qlpylgbbo9ec.worf.replit.dev";
  const markUrl = `https://${domain}:5904/xlango-mark.png`;
  const wordmarkUrl = `https://${domain}:5904/xlango-wordmark.png`;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: navy,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={markUrl}
          alt="XLango mark"
          style={{
            width: 120,
            height: 120,
            objectFit: "contain",
            marginBottom: -52,
          }}
        />
        <img
          src={wordmarkUrl}
          alt="xlango"
          style={{
            width: 340,
            height: 102,
            objectFit: "contain",
            marginBottom: -36,
          }}
        />
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: mutedFg,
            margin: 0,
            fontWeight: 500,
          }}
        >
          Live Global Voice Interpreter
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 60,
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: amber,
              opacity: i === 0 ? 1 : i === 1 ? 0.6 : 0.3,
            }}
          />
        ))}
      </div>
    </div>
  );
}
