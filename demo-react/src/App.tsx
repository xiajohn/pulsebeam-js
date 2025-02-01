import { useEffect, useRef, useState } from "react";
import { usePeerStore } from "./peer.ts";

export default function App() {
  const peer = usePeerStore();

  return (
    <>
      {(!peer.localStream || !peer.ref) ? <JoinPage /> : <SessionPage />}
    </>
  );
}

function JoinPage() {
  const peer = usePeerStore();
  const [peerId, setPeerId] = useState("");

  useEffect(() => {
    (async () => {
      const s = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      peer.setLocalStream(s);
    })();
  }, []);

  return (
    <article style={{ height: "100vh" }}>
      <div className="no-padding medium-width medium-height absolute center middle">
        <VideoContainer
          className="no-padding"
          stream={peer.localStream}
          loading={false}
          title={peerId}
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            peer.start(peerId);
          }}
        >
          <nav className="vertical">
            <div className="field border responsive">
              <input
                type="text"
                placeholder="You"
                value={peerId}
                onChange={(e) => setPeerId(e.target.value)}
              />
            </div>
            <button
              className="responsive small-round no-margin"
              type="submit"
              disabled={!peer.localStream || peer.loading}
              value="Ready"
            >
              {peer.loading
                ? <progress className="circle small"></progress>
                : <span>Ready</span>}
            </button>
          </nav>
        </form>
      </div>
    </article>
  );
}

function SessionPage() {
  const peer = usePeerStore();
  const [primaryStreamId, setPrimaryStreamId] = useState<string | null>(null);
  const remoteStreams = Object.entries(peer.sessions).map(([_, s]) => (
    <VideoContainer
      key={s.key}
      className="s12 l6 no-padding"
      title={s.sess.other.peerId}
      stream={s.remoteStream}
      loading={s.loading}
    />
  ));

  const primaryStream = primaryStreamId && peer.sessions[primaryStreamId];
  const streamIds = Object.keys(peer.sessions);
  if (primaryStreamId === null && streamIds.length > 0) {
    setPrimaryStreamId(streamIds[0]);
  }

  return (
    <div>
      {remoteStreams.length > 1 && (
        <nav className="left drawer">
          {Object.entries(peer.sessions).filter(([id, _]) =>
            id != primaryStreamId
          ).map(([_, s]) => (
            <VideoContainer
              key={s.key}
              className="no-padding"
              title={s.sess.other.peerId}
              stream={s.remoteStream}
              loading={s.loading}
            />
          ))}
        </nav>
      )}

      <main className="responsive max grid">
        <VideoContainer
          className="s12 l6 no-padding"
          stream={peer.localStream}
          loading={false}
          title={peer.peerId}
        />
        {primaryStream
          ? (
            <VideoContainer
              className="s12 l6 no-padding"
              title={primaryStream.sess.other.peerId}
              stream={primaryStream.remoteStream}
              loading={primaryStream.loading}
            />
          )
          : (
            <div className="s12 l6 no-padding">
              <ConnectForm />
            </div>
          )}
      </main>

      <nav className="bottom">
        <button
          className="error small-round"
          onClick={() => peer.stop()}
        >
          <i>call_end</i>
          End Call
        </button>
      </nav>
    </div>
  );
}

function ConnectForm() {
  const [otherPeerId, setOtherPeerId] = useState("");
  const peer = usePeerStore();

  return (
    <form
      className="vertical medium-width center-align auto-margin"
      style={{ height: "100%" }}
      onSubmit={(e) => {
        e.preventDefault();
        peer.connect(otherPeerId);
      }}
    >
      <nav className="vertical">
        <h3>Who to connect to?</h3>
        <div className="field border responsive">
          <input
            size={6}
            type="text"
            placeholder="Other"
            value={otherPeerId}
            onChange={(e) => setOtherPeerId(e.target.value)}
          />
        </div>
        <button
          className="responsive small-round"
          type="submit"
          disabled={peer.loading}
        >
          {peer.loading
            ? <progress className="circle small"></progress>
            : <span>Connect</span>}
        </button>
      </nav>
    </form>
  );
}

interface VideoContainerProps {
  title: string;
  stream: MediaStream | null;
  loading: boolean;
  className: string;
}

function VideoContainer(props: VideoContainerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = props.stream;
      videoRef.current.play();
    }
  }, [props.stream]);

  const loading = props.loading || props.stream === null;
  return (
    <article className={props.className}>
      {loading ? <progress className="circle large"></progress> : (
        <video
          data-testid={props.title}
          className="responsive"
          ref={videoRef}
          autoPlay
        />
      )}
      <div className="absolute bottom left right padding white-text">
        <nav>
          <h5>{props.title}</h5>
        </nav>
      </div>
    </article>
  );
}
