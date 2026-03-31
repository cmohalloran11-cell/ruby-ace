export default function PrivacyPage() {
  const updated = 'March 30, 2026';
  return (
    <div style={{ minHeight:'100vh', background:'#0e0e0e', padding:'60px 20px' }}>
      <div style={{ maxWidth:720, margin:'0 auto' }}>

        <a href="/" style={{ display:'inline-flex', alignItems:'center', gap:8, textDecoration:'none', marginBottom:40 }}>
          <svg width="24" height="29" viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg">
            <polygon points="40,0 0,25 40,35" fill="#c41e3a"/>
            <polygon points="40,0 80,25 40,35" fill="#9b1830"/>
            <polygon points="0,25 40,35 18,88" fill="#6e1022"/>
            <polygon points="80,25 40,35 62,88" fill="#c41e3a" opacity="0.78"/>
            <polygon points="40,35 18,88 40,96" fill="#4a0b18"/>
            <polygon points="40,35 62,88 40,96" fill="#851525"/>
          </svg>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:700, color:'#e2e8f0' }}>Ruby <span style={{ color:'#c41e3a' }}>Ace</span></span>
        </a>

        <h1 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:38, fontWeight:800, marginBottom:8, letterSpacing:'-0.5px' }}>Privacy Policy</h1>
        <p style={{ color:'#475569', fontSize:13, marginBottom:40 }}>Last updated: {updated}</p>

        {[
          {
            title: '1. Information We Collect',
            body: `When you create an account, we collect your email address and username. When you use the DFS Optimizer, we collect the lineups you generate and your optimizer settings. When you make a purchase, payment processing is handled by Stripe — we do not store your credit card information. We may collect usage data such as which features you use and how often.`
          },
          {
            title: '2. How We Use Your Information',
            body: `We use your information to provide and improve Ruby Ace, process payments, send account-related emails, and personalize your experience. We do not sell your personal information to third parties.`
          },
          {
            title: '3. Cookies',
            body: `Ruby Ace uses cookies and similar technologies to keep you logged in and remember your preferences. We also use Google AdSense, which may place cookies on your device to serve relevant advertisements. You can opt out of personalized advertising by visiting Google's Ads Settings at adssettings.google.com.`
          },
          {
            title: '4. Third-Party Services',
            body: `Ruby Ace uses the following third-party services: Stripe for payment processing, Supabase for database hosting, Google AdSense for advertising, and Vercel for hosting. Each of these services has their own privacy policy governing their use of your data.`
          },
          {
            title: '5. Data Retention',
            body: `We retain your account information for as long as your account is active. You may request deletion of your account and associated data at any time by contacting us at the email below.`
          },
          {
            title: '6. Security',
            body: `We use industry-standard security measures including encrypted connections (HTTPS), hashed passwords, and secure token-based authentication. However, no method of transmission over the internet is 100% secure.`
          },
          {
            title: '7. Children\'s Privacy',
            body: `Ruby Ace is not intended for users under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal information, please contact us immediately.`
          },
          {
            title: '8. Your Rights',
            body: `You have the right to access, correct, or delete your personal information. You may also opt out of marketing communications at any time. To exercise these rights, contact us at the email address below.`
          },
          {
            title: '9. Changes to This Policy',
            body: `We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on our site or sending an email. Continued use of Ruby Ace after changes constitutes acceptance of the updated policy.`
          },
          {
            title: '10. Contact Us',
            body: `If you have questions about this Privacy Policy, please contact us at: privacy@rubyace.pro`
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom:32 }}>
            <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:700, color:'#e2e8f0', marginBottom:10 }}>
              {section.title}
            </h2>
            <p style={{ color:'#94a3b8', fontSize:14, lineHeight:1.75, margin:0 }}>
              {section.body}
            </p>
          </div>
        ))}

        <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:24, marginTop:40, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <a href="/" style={{ fontSize:13, color:'#334155', textDecoration:'none' }}>← Back to Ruby Ace</a>
          <a href="/terms" style={{ fontSize:13, color:'#334155', textDecoration:'none' }}>Terms of Service →</a>
        </div>
      </div>
    </div>
  );
}
