export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">CongestionAI 🚦</h3>
            <p className="text-gray-400">
              AI-powered traffic congestion prediction platform for smarter cities.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">Features</h3>
            <ul className="space-y-2 text-gray-400">
              <li>3-72 hour predictions</li>
              <li>Real-time heatmaps</li>
              <li>Route optimization</li>
              <li>AI explainability</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">Technology</h3>
            <ul className="space-y-2 text-gray-400">
              <li>XGBoost ML Model</li>
              <li>SHAP Explainability</li>
              <li>FastAPI Backend</li>
              <li>Next.js Frontend</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} CongestionAI. Built for smarter traffic management.</p>
        </div>
      </div>
    </footer>
  );
}
