export default function TestTailwind() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-600 mb-8">Tailwind CSS Test Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Test Card 1 */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Basic Card</h2>
            <p className="text-gray-600 mb-4">This card tests basic Tailwind classes.</p>
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
              Test Button
            </button>
          </div>
          
          {/* Test Card 2 */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <h2 className="text-xl font-semibold mb-4">Gradient Card</h2>
            <p className="mb-4 opacity-90">This card tests gradients and colors.</p>
            <button className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg border border-white border-opacity-30 transition-all">
              Gradient Button
            </button>
          </div>
          
          {/* Test Card 3 */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-green-800 mb-4">Success Card</h2>
            <p className="text-green-700 mb-4">This card tests green color variants.</p>
            <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
              Success Button
            </button>
          </div>
        </div>
        
        {/* Test Grid */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Grid System Test</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="bg-blue-100 border border-blue-300 rounded p-4 text-center">
                <span className="text-blue-800 font-medium">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Test Typography */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Typography Test</h2>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Heading 1 (3xl)</h1>
            <h2 className="text-2xl font-semibold text-gray-800">Heading 2 (2xl)</h2>
            <h3 className="text-xl font-medium text-gray-700">Heading 3 (xl)</h3>
            <p className="text-base text-gray-600">Regular paragraph text (base)</p>
            <p className="text-sm text-gray-500">Small text (sm)</p>
            <p className="text-xs text-gray-400">Extra small text (xs)</p>
          </div>
        </div>
        
        {/* Test Colors */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Color Test</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-red-500 text-white p-4 rounded text-center">Red 500</div>
            <div className="bg-green-500 text-white p-4 rounded text-center">Green 500</div>
            <div className="bg-blue-500 text-white p-4 rounded text-center">Blue 500</div>
            <div className="bg-yellow-500 text-white p-4 rounded text-center">Yellow 500</div>
            <div className="bg-purple-500 text-white p-4 rounded text-center">Purple 500</div>
            <div className="bg-pink-500 text-white p-4 rounded text-center">Pink 500</div>
            <div className="bg-indigo-500 text-white p-4 rounded text-center">Indigo 500</div>
            <div className="bg-gray-500 text-white p-4 rounded text-center">Gray 500</div>
          </div>
        </div>
      </div>
    </div>
  );
}
