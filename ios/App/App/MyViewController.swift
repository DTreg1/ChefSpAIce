import UIKit
import Capacitor

class MyViewController: CAPBridgeViewController {
    
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        
        // Register any custom plugins here
        // bridge?.registerPluginInstance(MyCustomPlugin())
        
        // Configure the bridge for ChefSpAIce
        configureApp()
    }
    
    private func configureApp() {
        // Set status bar style
        setNeedsStatusBarAppearanceUpdate()
        
        // Configure web view settings
        webView?.scrollView.bounces = true
        webView?.scrollView.isScrollEnabled = true
        webView?.allowsBackForwardNavigationGestures = true
        
        // Enable zoom for accessibility
        webView?.scrollView.minimumZoomScale = 1.0
        webView?.scrollView.maximumZoomScale = 3.0
        
        // Configure safe area handling
        if #available(iOS 11.0, *) {
            webView?.scrollView.contentInsetAdjustmentBehavior = .automatic
        }
    }
    
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }
    
    override var prefersStatusBarHidden: Bool {
        return false
    }
    
    // Handle deep links
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Listen for deep link notifications
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleDeepLink(_:)),
            name: Notification.Name("handleDeepLink"),
            object: nil
        )
    }
    
    @objc func handleDeepLink(_ notification: Notification) {
        if let url = notification.userInfo?["url"] as? URL {
            var fullPath = ""
            let scheme = url.scheme?.lowercased() ?? ""
            
            // Check if this is a custom URL scheme (not http/https)
            let isCustomScheme = scheme != "http" && scheme != "https"
            
            if isCustomScheme {
                // For custom URL schemes (e.g., chefspice://recipe/42)
                // The host is the first path segment: host="recipe", path="/42" -> fullPath="/recipe/42"
                if let host = url.host, !host.isEmpty {
                    fullPath = "/" + host
                }
                fullPath += url.path
            } else {
                // For universal links (e.g., https://app.chefspice.com/recipe/42)
                // Just use the path directly, ignore the domain
                fullPath = url.path
            }
            
            // If path is empty, default to root
            if fullPath.isEmpty {
                fullPath = "/"
            }
            
            // Use JSON serialization to safely escape values (prevents XSS)
            guard let jsonData = try? JSONSerialization.data(withJSONObject: [
                "path": fullPath,
                "query": url.query ?? ""
            ]),
                  let jsonString = String(data: jsonData, encoding: .utf8) else {
                return
            }
            
            // Navigate within the web app using safe message passing
            let jsCode = """
                (function() {
                    try {
                        var data = \(jsonString);
                        if (data.path && typeof data.path === 'string') {
                            var newPath = data.path;
                            if (data.query) {
                                newPath += '?' + data.query;
                            }
                            window.location.href = newPath;
                        }
                    } catch(e) {
                        console.error('Deep link error:', e);
                    }
                })();
            """
            webView?.evaluateJavaScript(jsCode, completionHandler: nil)
        }
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
}
