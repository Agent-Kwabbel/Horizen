export default function SettingsAbout() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-3">About Horizen</h3>

      <div className="bg-white/5 rounded-lg p-4 space-y-2 text-sm text-white/80">
        <p>
          Horizen is a privacy-first browser start page combining powerful features: fast client side bang operators, AI chat supporting OpenAI, Anthropic, and Google Gemini, customizable quick links, a local weather widget, and a market tracker for stocks and cryptocurrencies.
        </p>

        <p>
          <strong className="text-white/90">Security & Encryption:</strong> All API keys are encrypted with AES-256-GCM before storage. Optional password protection (BETA) adds an extra security layer using PBKDF2 key derivation. When enabled, you can lock/unlock your session and change your password. API keys are re-encrypted when changing passwords.
        </p>

        <p>
          <strong className="text-white/90">Data Storage:</strong> All data is stored locally in your browser using localStorage. Chat conversations, preferences, and encrypted keys persist across browser restarts but are permanently deleted when you clear browser data. Use the Import/Export feature (BETA) to backup your data.
        </p>

        <p>
          <strong className="text-white/90">Privacy:</strong> No data is sent to external servers except your chosen AI providers (OpenAI, Anthropic, or Google) when you send chat messages through secure Vercel Edge Functions. Weather data is fetched from Open-Meteo's free API. Market data is fetched from Yahoo Finance (stocks via CORS proxy) and CoinGecko (crypto). Search queries go directly to your search engine of choice. Your API keys are never stored on servers.
        </p>

        <p>
          <strong className="text-white/90">Development Status:</strong> Actively maintained with regular updates. For the latest features, bug reports, or contributions, visit the{" "}
          <a
            href="https://github.com/Agent-Kwabbel/Horizen"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            GitHub repository
          </a>
          .
        </p>

        <p>
          <strong className="text-white/90">License:</strong> This project is licensed under the{" "}
          <a
            href="https://github.com/Agent-Kwabbel/Horizen/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            GNU Affero General Public License v3.0 (AGPL-3.0)
          </a>
          .
        </p>
      </div>
    </div>
  )
}
