import { modelStats } from "@/data/modelStats";

export default function ModelStatsCard() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-8 py-20">
      {/* Title */}
      <h2 className="text-4xl font-bold mb-10 text-center">Model Performance Metrics</h2>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {[
          { title: "Test Accuracy", value: modelStats.summary.accuracy },
          { title: "Val Accuracy", value: modelStats.validation.accuracy },
          { title: "Val Precision", value: modelStats.validation.precision },
          { title: "Val F1 Score", value: modelStats.validation.f1 },
        ].map((item, i) => (
          <div
            key={i}
            className="bg-[#515151]/10 border border-[#515151]/30 rounded-xl p-6 text-center backdrop-blur-sm shadow-md"
          >
            <p className="text-sm text-gray-400 mb-2">{item.title}</p>
            <p className="text-3xl font-semibold text-[#d4d4d4]">
              {(item.value * 100).toFixed(2)}%
            </p>
          </div>
        ))}
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-[#515151]/30 bg-[#1d1d1d]/80 backdrop-blur-sm shadow-lg">
        <table className="w-full text-left text-gray-300">
          <thead className="bg-[#515151]/20">
            <tr>
              <th className="px-6 py-4">Class</th>
              <th className="px-6 py-4">Precision</th>
              <th className="px-6 py-4">Recall</th>
              <th className="px-6 py-4">F1 Score</th>
              <th className="px-6 py-4">Support</th>
            </tr>
          </thead>

          <tbody>
            {modelStats.classes.map((row, i) => (
              <tr
                key={i}
                className="border-t border-[#515151]/20 hover:bg-[#515151]/10 transition"
              >
                <td className="px-6 py-4 font-semibold text-white">{row.label}</td>
                <td className="px-6 py-4">{row.precision.toFixed(2)}</td>
                <td className="px-6 py-4">{row.recall.toFixed(2)}</td>
                <td className="px-6 py-4">{row.f1.toFixed(2)}</td>
                <td className="px-6 py-4">{row.support}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Macro + Weighted Averages */}
      <div className="grid md:grid-cols-2 gap-6 mt-12">
        {[ 
          { title: "Macro Average", data: modelStats.summary.macroAvg },
          { title: "Weighted Average", data: modelStats.summary.weightedAvg },
        ].map((item, i) => (
          <div
            key={i}
            className="bg-[#515151]/10 border border-[#515151]/20 rounded-xl p-6 backdrop-blur-sm"
          >
            <h3 className="text-xl font-semibold mb-4">{item.title}</h3>
            <div className="space-y-2 text-gray-300">
              <p>Precision: {item.data.precision.toFixed(2)}</p>
              <p>Recall: {item.data.recall.toFixed(2)}</p>
              <p>F1 Score: {item.data.f1.toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
