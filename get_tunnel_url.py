import time
import json
import urllib.request
import webbrowser
from pathlib import Path

def fetch_and_announce_tunnel():
    print("Waiting for Cloudflare Tunnel to establish secure public connection...")
    for i in range(20):
        try:
            req = urllib.request.Request("http://127.0.0.1:20241/quicktunnel")
            with urllib.request.urlopen(req, timeout=2) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                hostname = data.get("hostname")
                if hostname:
                    public_url = f"https://{hostname}"
                    print("\n" + "=" * 70)
                    print(f"🎉 YOUR LIVE PUBLIC LINK IS READY!")
                    print(f"👉 {public_url}")
                    print(f"👉 {public_url}/docs  (For Swagger API Docs)")
                    print("=" * 70)
                    print("Share this link with your remote team members!\n")

                    # Save to file for easy copy-pasting
                    txt_path = Path(__file__).resolve().parent / "CURRENT_PUBLIC_URL.txt"
                    txt_path.write_text(public_url, encoding="utf-8")

                    # Automatically open the public link in the browser
                    webbrowser.open(public_url)
                    return
        except Exception:
            time.sleep(1)

    print("Could not retrieve tunnel URL automatically. Check the console output above.")

if __name__ == "__main__":
    fetch_and_announce_tunnel()
