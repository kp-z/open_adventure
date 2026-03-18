export default function DevCheck() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">开发模式检查</h1>

      <div className="space-y-4">
        <div className="bg-white/5 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">环境变量</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <span className="text-gray-400">import.meta.env.DEV:</span>{' '}
              <span className={import.meta.env.DEV ? 'text-green-400' : 'text-red-400'}>
                {String(import.meta.env.DEV)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">import.meta.env.PROD:</span>{' '}
              <span className={import.meta.env.PROD ? 'text-red-400' : 'text-green-400'}>
                {String(import.meta.env.PROD)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">import.meta.env.MODE:</span>{' '}
              <span className="text-blue-400">{import.meta.env.MODE}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">测试图标状态</h2>
          <p className="text-gray-300">
            {import.meta.env.DEV ? (
              <span className="text-green-400">✓ 开发模式：测试图标应该显示</span>
            ) : (
              <span className="text-red-400">✗ 生产模式：测试图标不会显示</span>
            )}
          </p>
        </div>

        <div className="bg-white/5 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">访问地址</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <span className="text-gray-400">当前地址:</span>{' '}
              <span className="text-blue-400">{window.location.href}</span>
            </div>
            <div>
              <span className="text-gray-400">端口:</span>{' '}
              <span className="text-blue-400">{window.location.port}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">检查清单</h2>
          <ul className="space-y-2 text-sm">
            <li className={window.location.port === '5173' ? 'text-green-400' : 'text-red-400'}>
              {window.location.port === '5173' ? '✓' : '✗'} 端口应该是 5173（开发模式）
            </li>
            <li className={import.meta.env.DEV ? 'text-green-400' : 'text-red-400'}>
              {import.meta.env.DEV ? '✓' : '✗'} import.meta.env.DEV 应该是 true
            </li>
            <li className="text-gray-400">
              → 如果以上都正确，测试图标应该在侧边栏左下角（Settings 下方）
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
