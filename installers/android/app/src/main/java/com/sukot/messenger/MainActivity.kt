package com.sukot.messenger

import android.annotation.SuppressLint
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

/**
 * SUKOT MESSENGER — Android wrapper
 *
 * - Neon splash screen while loading
 * - Persian error screen with retry button when the server is unreachable
 * - URL is configured in res/values/strings.xml (app_url)
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var splash: LinearLayout
    private lateinit var errorView: LinearLayout
    private lateinit var root: FrameLayout
    private var hadError = false

    private val neonPurple = Color.parseColor("#b026ff")
    private val bgDark = Color.parseColor("#0b0614")
    private val textGray = Color.parseColor("#9b8fb0")

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.statusBarColor = bgDark
        window.navigationBarColor = bgDark

        val appUrl = getString(R.string.app_url)

        root = FrameLayout(this).apply {
            setBackgroundColor(bgDark)
        }
        setContentView(root)

        // ─────────── Splash screen ───────────
        splash = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(bgDark)
        }
        val logoView = ImageView(this).apply {
            setImageDrawable(ContextCompat.getDrawable(context, R.drawable.splash_logo))
            adjustmentViewBounds = true
        }
        val logoParams = LinearLayout.LayoutParams(420, 420).apply {
            gravity = Gravity.CENTER_HORIZONTAL
            bottomMargin = 40
        }
        val subtitle = TextView(this).apply {
            text = getString(R.string.splash_subtitle)
            textSize = 16f
            setTextColor(textGray)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 56)
        }
        val spinner = ProgressBar(this).apply {
            indeterminateTintList = android.content.res.ColorStateList.valueOf(neonPurple)
        }
        splash.addView(logoView, logoParams)
        splash.addView(subtitle)
        splash.addView(spinner)
        root.addView(splash, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))

        // ─────────── Error view (Persian) ───────────
        errorView = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(bgDark)
            visibility = View.GONE
        }
        val errIcon = TextView(this).apply {
            text = "⚠"
            textSize = 54f
            setTextColor(Color.parseColor("#ffb020"))
            gravity = Gravity.CENTER
        }
        val errTitle = TextView(this).apply {
            text = getString(R.string.error_title)
            textSize = 22f
            setTypeface(Typeface.DEFAULT_BOLD)
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setPadding(0, 32, 0, 12)
        }
        val errMsg = TextView(this).apply {
            text = getString(R.string.error_message)
            textSize = 14f
            setTextColor(textGray)
            gravity = Gravity.CENTER
            setPadding(64, 0, 64, 40)
        }
        val retryBtn = Button(this).apply {
            text = getString(R.string.error_retry)
            textSize = 16f
            setTypeface(Typeface.DEFAULT_BOLD)
            setTextColor(Color.WHITE)
            isAllCaps = false
            background = GradientDrawable().apply {
                cornerRadius = 28f
                setColor(neonPurple)
            }
            setPadding(80, 8, 80, 8)
        }
        retryBtn.setOnClickListener {
            errorView.visibility = View.GONE
            splash.visibility = View.VISIBLE
            hadError = false
            webView.reload()
        }
        errorView.addView(errIcon)
        errorView.addView(errTitle)
        errorView.addView(errMsg)
        errorView.addView(retryBtn)
        root.addView(errorView, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))

        // ─────────── WebView ───────────
        webView = WebView(this)
        root.addView(webView, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false
            userAgentString = "$userAgentString SukotAndroid/1.0"
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false
                // keep the user inside the app for the messenger domain
                return !(url.startsWith(getString(R.string.app_url)))
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                if (!hadError) {
                    splash.visibility = View.GONE
                    errorView.visibility = View.GONE
                }
                super.onPageFinished(view, url)
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                if (request?.isForMainFrame == true) {
                    hadError = true
                    splash.visibility = View.GONE
                    errorView.visibility = View.VISIBLE
                }
                super.onReceivedError(view, request, error)
            }
        }

        // Back button navigates the web history first
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })

        webView.loadUrl(appUrl)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        return super.onKeyDown(keyCode, event)
    }
}
