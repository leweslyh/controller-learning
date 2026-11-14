/* ============================================================
   papers.js — 159 种控制方法的原论文出处（离线数据，零网络请求）
   ------------------------------------------------------------
   数据来源：他人最新版 index (14).html 的 PAPER_CITATIONS，
   由 tools/port-v4.js 抽取、tools/port-v4-apply.js 生成。
   核验结果与依据见 public/docs/论文引用核验.md；本次判定：verified 153 / suspect 6 / unreachable 0 / unverified 0；本次判定：verified 153 / suspect 6 / unreachable 0 / unverified 0；
   status: verified | suspect | unreachable | unverified
   运行时只渲染元数据与链接，不发起任何请求。
   ============================================================ */
(function (global) {
  'use strict';
  const NS = global.CtrlSim = global.CtrlSim || {};
  const citations = {
  "P": {
    "authors": "J. G. Ziegler & N. B. Nichols (1942)",
    "title": "Optimum Settings for Automatic Controllers",
    "journal": "Transactions of the ASME, 64(8), 759–765",
    "url": "https://asmedigitalcollection.asme.org/fluidsengineering/article/64/8/759/1155342/Optimum-Settings-for-Automatic-Controllers"
  },
  "PI": {
    "authors": "K. H. Ang, G. Chong, & Y. Li (2005)",
    "title": "PID Control System Analysis, Design, and Technology",
    "journal": "IEEE Transactions on Control Systems Technology, 13(4), 559–576",
    "url": "https://www.semanticscholar.org/paper/PID-control-system-analysis%2C-design%2C-and-technology-Ang-Chong/819e12c46c95add85a4bbfcffa8fe6ba5b1924a4"
  },
  "PD": {
    "authors": "Y. Li, K. H. Ang, & G. Chong (2006)",
    "title": "PID Control System Analysis and Design: Problems, Remedies, and Future Directions",
    "journal": "IEEE Control Systems Magazine, 26(1), 32–41",
    "url": "https://www.semanticscholar.org/paper/PID-control-system-analysis-and-design-Li-Ang/b1d216cafc99fb18fa845dffa628ca78c47911fc"
  },
  "PID": {
    "authors": "J. G. Ziegler & N. B. Nichols (1993)",
    "title": "Optimum Settings for Automatic Controllers",
    "journal": "ASME Journal of Dynamic Systems, Measurement, and Control, 115(2B), 220–222",
    "url": "https://asmedigitalcollection.asme.org/dynamicsystems/article/115/2B/220/417448/Optimum-Settings-for-Automatic-Controllers"
  },
  "IncPID": {
    "authors": "Y. Li, K. H. Ang, & G. Chong (2006)",
    "title": "Patents, Software, and Hardware for PID Control: An Overview and Analysis of the Current Art",
    "journal": "IEEE Control Systems Magazine, 26(1), 42–54",
    "url": "https://www.semanticscholar.org/paper/Patents%2C-software%2C-and-hardware-for-PID-control%3A-an-Li-Ang/92e46e281a379a5d49dce11392766c32abd15e0a"
  },
  "IPD": {
    "authors": "M. Araki & H. Taguchi (2003)",
    "title": "Two-Degree-of-Freedom PID Controllers",
    "journal": "International Journal of Control, Automation, and Systems, 1(4), 401–411",
    "url": "https://skoge.folk.ntnu.no/puublications_others/2003-araki-2dof-control.pdf"
  },
  "PI-D": {
    "authors": "M. Araki & H. Taguchi (2003)",
    "title": "Two-Degree-of-Freedom PID Controllers",
    "journal": "International Journal of Control, Automation, and Systems, 1(4), 401–411",
    "url": "https://www.semanticscholar.org/paper/Two-Degree-of-Freedom-PID-Controllers-Araki-Taguchi/d1db1fb877f1330e2e9d8890f77b6efa3b351bdb"
  },
  "2DOF-PID": {
    "authors": "H. Taguchi & M. Araki (2000)",
    "title": "Two-Degree-of-Freedom PID Controllers — Their Functions and Optimal Tuning",
    "journal": "IFAC Proceedings Volumes (Digital Control), 33(4), 91–96",
    "url": "https://www.researchgate.net/publication/302552793_Two-Degree-of-Freedom_PID_Controllers_-_Their_Functions_and_Optimal_Tuning"
  },
  "Nested-PID": {
    "authors": "M. V. Sadasivarao & M. Chidambaram (2006)",
    "title": "PID Controller tuning of cascade control systems using genetic algorithm",
    "journal": "Journal of the Indian Institute of Science, 86(4), 343–354",
    "url": "https://www.semanticscholar.org/paper/PID-Controller-tuning-of-cascade-control-systems-Sadasivarao-Chidambaram/2cbf4124f81fa6be29f116513568b33e2ca42e51"
  },
  "AW-PI": {
    "authors": "H. Markaroglu, M. Guzelkaya, I. Eksin, & E. Yesil (2006)",
    "title": "Tracking Time Adjustment In Back Calculation Anti-Windup Scheme",
    "journal": "Proceedings of the 20th European Conference on Modelling and Simulation (ECMS)",
    "url": "https://www.semanticscholar.org/paper/Tracking-Time-Adjustment-In-Back-Calculation-Scheme-Markaroglu-Guzelkaya/15f18a98877d64fb8c38dd7125ee6368cb985e37"
  },
  "Clamping-PID": {
    "authors": "A. Visioli (2003)",
    "title": "Modified anti-windup scheme for PID controllers",
    "journal": "IEE Proceedings - Control Theory and Applications, 150(1), 49–54",
    "url": "https://www.semanticscholar.org/paper/Modified-anti-windup-scheme-for-PID-controllers-Visioli/22ce762c41e4c8470e3fdc57789ea71de1bbb015"
  },
  "Sep-Int-PID": {
    "authors": "Y. Furukawa & F. Kurokawa (2017)",
    "title": "Analytical approach for novel digital PID control switching power supply",
    "journal": "IEEE International Telecommunications Energy Conference (INTELEC)",
    "url": "https://www.semanticscholar.org/paper/Analytical-approach-for-novel-digital-PID-control-Furukawa-Kurokawa/1aebfd1f11cf4b185f951d7155baa0e3ec69fe0c"
  },
  "VarRate-PID": {
    "authors": "C. Hoo, E. Chung, & T. L. Chiah (2015)",
    "title": "Steady-State Integral Proportional Integral Controller for PI Motor Speed Controllers",
    "journal": "Journal of Power Electronics, 15(1), 177–189",
    "url": "https://www.semanticscholar.org/paper/Steady-State-Integral-Proportional-Integral-for-PI-Hoo-Chung/6963c3e4d4c03acff6283a4e6f02b421f440ccb9"
  },
  "FilterD-PID": {
    "authors": "A. J. Isaksson & S. F. Graebe (2002)",
    "title": "Derivative filter is an integral part of PID design",
    "journal": "IEE Proceedings - Control Theory and Applications, 149(1), 41–45",
    "url": "https://www.semanticscholar.org/paper/Derivative-filter-is-an-integral-part-of-PID-design-Isaksson-Graebe/a6d7ef94d02a50a3e526f002621e7ee62a99fbeb"
  },
  "Deadband-PID": {
    "authors": "V. Vasyutynskyy & K. Kabitzsch (2009)",
    "title": "Simple PID control algorithm adapted to deadband sampling",
    "journal": "IEEE Conference on Emerging Technologies & Factory Automation (ETFA)",
    "url": "https://www.semanticscholar.org/paper/Simple-PID-control-algorithm-adapted-to-deadband-Vasyutynskyy-Kabitzsch/5cc92dd9c13c7ab7332c5fe0a49e8e73dfac5a07/figure/4"
  },
  "RampSP-PID": {
    "authors": "A. Paul, N. Dey, & J. Mudi (2014)",
    "title": "An online dynamic set point weighting scheme for PID controller",
    "journal": "IEEE International Conference on Control, Instrumentation, Energy and Communication",
    "url": "https://www.semanticscholar.org/paper/An-online-dynamic-set-point-weighting-scheme-for-Paul-Dey/07ed0d4284c016b2739f586d7071913e7624c82e"
  },
  "Expert-PID": {
    "authors": "K. J. Åström, C. C. Hang, P. Persson, & W. K. Ho (1992)",
    "title": "Towards Intelligent PID Control",
    "journal": "Automatica / IFAC Proceedings Volumes, 28(1), 1–9",
    "url": "https://www.sciencedirect.com/science/article/abs/pii/000510989290002W"
  },
  "NPID": {
    "authors": "Y. X. Su, D. Sun, & B. Y. Duan (2005)",
    "title": "Design of an enhanced nonlinear PID controller",
    "journal": "Mechatronics, 15(8), 1005–1024",
    "url": "https://www.semanticscholar.org/paper/Design-of-an-enhanced-nonlinear-PID-controller-Su-Sun/3fe47bfcbfcf73b9ce137bc0eddf761bff8990fc"
  },
  "FuzzyPID": {
    "authors": "Z.-Y. Zhao, M. Tomizuka, & S. Isaka (1993)",
    "title": "Fuzzy gain scheduling of PID controllers",
    "journal": "IEEE Transactions on Systems, Man, and Cybernetics, 23(5), 1392–1398",
    "url": "https://www.semanticscholar.org/paper/Fuzzy-gain-scheduling-of-PID-controllers-Zhao-Tomizuka/1d7765cdacb0fc27f2625b15e61805cf31e0bcfe"
  },
  "NeuralPID": {
    "authors": "J. Zhang, X. Li, & Y. Wang (2011)",
    "title": "Single Neuron PID Model Reference Adaptive Control Based on RBF Neural Networks",
    "journal": "IEEE International Conference on Computer Science and Automation Engineering",
    "url": "https://www.semanticscholar.org/paper/Single-Neuron-PID-Model-Reference-Adaptive-Control-Zhang-Li/920b5abcda1a178de78a8c56a82812cd9e6458d3"
  },
  "Gradient-PID": {
    "authors": "H. Hjalmarsson, M. Gevers, S. Gunnarsson, & O. Lequin (1998)",
    "title": "Iterative Feedback Tuning: Theory and Applications",
    "journal": "IEEE Control Systems Magazine, 18(4), 26–41",
    "url": "https://perso.uclouvain.be/michel.gevers/PublisMig/IFT-CSMagazine98.pdf"
  },
  "iPID": {
    "authors": "M. Fliess & C. Join (2013)",
    "title": "Model-free control",
    "journal": "International Journal of Control, 86(12), 2228–2252",
    "url": "https://www.tandfonline.com/doi/abs/10.1080/00207179.2013.810345"
  },
  "OpenLoop": {
    "authors": "M. Müller & S. Liu (2020)",
    "title": "Vibration control of a flexible single-link robot: open-loop vs. closed-loop control",
    "journal": "International Conference on System Theory, Control and Computing (ICSTCC)",
    "url": "https://www.semanticscholar.org/paper/Vibration-control-of-a-flexible-single-link-robot%3A-Muller-Liu/fc59f1a10faf1f89859427156fcb9e300c886904"
  },
  "QFT-LeadLag": {
    "authors": "J. L. Krishnankutty, B. M. Nayak, & S. K. Panda (2023)",
    "title": "Quantitative feedback theory based robust speed control of vector controlled induction motor",
    "journal": "International Journal of Power Electronics and Drive Systems, 14(1), 112–121",
    "url": "https://www.researchgate.net/publication/367762191_Quantitative_feedback_theory_based_robust_speed_control_of_vector_controlled_induction_motor"
  },
  "Lag-Compensator": {
    "authors": "J.-H. Horng (2000)",
    "title": "Lead-Lag Compensator Design Based on Genetic Algorithms",
    "journal": "Journal of Marine Science and Technology, 8(2), 97–102",
    "url": "https://www.semanticscholar.org/paper/Lead-Lag-Compensator-Design-Based-on-Genetic-Horng/5f0e68c9ddfc9728175f7d8a38a6d4fb6b9a026e"
  },
  "Lead-Lag-Full": {
    "authors": "R. Zanasi & S. Cuoghi (2011)",
    "title": "Analytical Design of Lead-Lag Compensators on Nyquist and Nichols Planes",
    "journal": "IFAC Proceedings Volumes (18th IFAC World Congress), 44(1), 6789–6794",
    "url": "https://www.semanticscholar.org/paper/Analytical-Design-of-Lead-Lag-Compensators-on-and-Zanasi-Cuoghi/ea43071d4878d4523c96335841e6b5dbaa6fdb15"
  },
  "Notch-Filter-PD": {
    "authors": "W. Singhose, D. Kim, & M. Kenison (2008)",
    "title": "Input Shaping and Notch Filtering of Oscillatory Mechanical Modes",
    "journal": "ASME Journal of Dynamic Systems, Measurement, and Control",
    "url": "https://www.sciencedirect.com/science/article/pii/S0967066107001724"
  },
  "PR-Resonant": {
    "authors": "R. Teodorescu, F. Blaabjerg, M. Liserre, & P. C. Loh (2006)",
    "title": "Proportional-Resonant Controllers and Filters for Grid-Connected Converters",
    "journal": "IEE EPA",
    "url": "https://digital-library.theiet.org/doi/10.1049/ip-epa%3A20060008"
  },
  "Double-Int-Servo": {
    "authors": "B. A. Francis & W. M. Wonham (1976)",
    "title": "The internal model principle of control theory",
    "journal": "Automatica, 12(5), 457–465",
    "url": "https://www.semanticscholar.org/paper/The-internal-model-principle-of-control-theory-Francis-Wonham/da7a60f2db454fda5a5c412f567edd798f506d80"
  },
  "PIDA-Controller": {
    "authors": "S. Jung & R. C. Dorf (1996)",
    "title": "Analytic PIDA Controller Design Technique for a Third Order System",
    "journal": "Proceedings of the 35th IEEE Conference on Decision and Control (CDC), 2513–2518",
    "url": "https://www.semanticscholar.org/paper/Analytic-PIDA-controller-design-technique-for-a-Jung-Dorf/0b36bece29034de7897dd1ba1c8b111f2f08d19a"
  },
  "Bode-Step-Comp": {
    "authors": "S. Ekinci, D. Izci, & B. Hekimoğlu (2022)",
    "title": "A novel improved arithmetic optimization algorithm for optimal design of PID controlled and Bode's ideal transfer function based automobile cruise control system",
    "journal": "Evolving Systems, 13(3), 1–16",
    "url": "https://www.researchgate.net/publication/354198908_A_novel_improved_arithmetic_optimization_algorithm_for_optimal_design_of_PID_controlled_and_Bode's_ideal_transfer_function_based_automobile_cruise_control_system"
  },
  "Two-Stage-Lead": {
    "authors": "S. Jung & R. C. Dorf (1996)",
    "title": "Novel Analytic Technique for PID and PIDA Controller Design",
    "journal": "IFAC Proceedings Volumes (13th IFAC World Congress), 29(1), 1146–1151",
    "url": "https://www.semanticscholar.org/paper/Novel-Analytic-Technique-for-PID-and-PIDA-Design-Jung-Dorf/1762fc7398c7072a482e890fcc65d6d6f92555cb"
  },
  "PolePlacement": {
    "authors": "I. Iswanto, L. P. Raharja, & A. Ma'arif (2021)",
    "title": "Pole Placement Based State Feedback for DC Motor Position Control",
    "journal": "Journal of Robotics and Control (JRC), 2(5), 426–431",
    "url": "https://www.semanticscholar.org/paper/Pole-Placement-Based-State-Feedback-for-DC-Motor-Iswanto-Raharja/c26a82e187702e727a2634548c0c74a2d34cfa7f"
  },
  "LQR": {
    "authors": "R. E. Kalman (1960)",
    "title": "Contributions to the Theory of Optimal Control",
    "journal": "Boletín de la Sociedad Matemática Mexicana, 5, 102–119",
    "url": "https://boletin.math.org.mx/pdf/2/5/BSMM(2).5.102-119.pdf"
  },
  "LQG": {
    "authors": "R. E. Kálmán (1960)",
    "title": "A New Approach to Linear Filtering and Prediction Problems",
    "journal": "ASME Journal of Basic Engineering, 82(1), 35–45",
    "url": "https://www.semanticscholar.org/paper/A-new-approach-to-linear-filtering-and-prediction-K%C3%A1lm%C3%A1n/775cab39107ecac3f60c395abcac3d2a77765046"
  },
  "LQR-I": {
    "authors": "L. Kisszölgyémi, K. Beneda, & L. Főző (2019)",
    "title": "Linear quadratic integral (LQI) control for a small scale turbojet engine",
    "journal": "IEEE International Symposium on Small-scale Intelligent Manufacturing Systems",
    "url": "https://www.semanticscholar.org/paper/Linear-quadratic-integral-(LQI)-control-for-a-small-Kissz%C3%B6lgy%C3%A9mi-Beneda/edd28b0893160c70faa2b6bf1cc3298ef24d8698"
  },
  "Deadbeat": {
    "authors": "T. L. Tiang & D. Ishak (2014)",
    "title": "Modeling and simulation of deadbeat-based PI controller in a single-phase UPS inverter",
    "journal": "IEEE Conference on Energy Conversion (CENCON)",
    "url": "https://www.semanticscholar.org/paper/Modeling-and-simulation-of-deadbeat-based-PI-in-a-Tiang-Ishak/c54f3d06f74bdc0ada2caf74632d72e9e5ad9d1f/figure/0"
  },
  "IMP-Servo": {
    "authors": "B. A. Francis & W. M. Wonham (1976)",
    "title": "The Internal Model Principle of Control Theory",
    "journal": "Automatica, 12(5), 457–465",
    "url": "https://www.researchgate.net/publication/223996193_The_Internal_Model_Principle_of_Control_Theory"
  },
  "Preview": {
    "authors": "M. Tomizuka (1975)",
    "title": "Optimum Linear Preview Control With Application to Vehicle Suspension",
    "journal": "ASME Journal of Dynamic Systems, Measurement, and Control, 97(4), 319–325",
    "url": "https://scispace.com/papers/optimum-linear-preview-control-with-application-to-vehicle-3l6gvdyy3a"
  },
  "Kalman-Pole": {
    "authors": "R. E. Kalman (1960)",
    "title": "A New Approach to Linear Filtering and Prediction Problems",
    "journal": "ASME Journal of Basic Engineering, 82(1), 35–45",
    "url": "https://scispace.com/pdf/a-new-approach-to-linear-filtering-and-prediction-problems-1f1lkk9j5b.pdf"
  },
  "Minimum-Energy": {
    "authors": "L. Hong, A. T. Nguyen, & Y. Shi (2026)",
    "title": "Minimum-Energy Control for Stochastic Linear Systems",
    "journal": "arXiv Systems and Control (arXiv:2610.13424)",
    "url": "https://arxiv.org/abs/2610.13424"
  },
  "LQT-Tracking": {
    "authors": "E. Zavrakli, A. Parnell, & S. Dey (2023)",
    "title": "Data-driven linear quadratic tracking based temperature control of a big area additive manufacturing system",
    "journal": "Control Engineering Practice / Semantic Scholar",
    "url": "https://www.semanticscholar.org/paper/Data-driven-linear-quadratic-tracking-based-control-Zavrakli-Parnell/99188bd476caf7a976d925cac6518d3ebc9bb1e0"
  },
  "H-Infinity": {
    "authors": "A. J. van der Schaft (1992)",
    "title": "Nonlinear State Space H∞ Control Theory",
    "journal": "Perspectives in Control, Birkhäuser Boston, 153–190",
    "url": "https://www.semanticscholar.org/paper/Nonlinear-State-Space-H-%E2%88%9E-Control-Theory-Schaft/27ff4fc0254d37790fec648eec022c5ad4eb0ef2"
  },
  "H2-Optimal": {
    "authors": "A. Lamperski & J. C. Doyle (2012)",
    "title": "The H2 Control Problem for Quadratically Invariant Systems With Delays",
    "journal": "IEEE Transactions on Automatic Control, 57(7), 1845–1850",
    "url": "https://www.semanticscholar.org/paper/The-%24%7B%5Ccal-H%7D_%7B2%7D-%24-Control-Problem-for-Invariant-Lamperski-Doyle/0ec5e722a085da4771cd30b40626df4580eab4a4"
  },
  "Mixed-H2-Hinf": {
    "authors": "X. Wang, E. E. Yaz, & S. C. Schneider (2017)",
    "title": "H2−H∞ control of discrete-time nonlinear systems using the state-dependent Riccati equation approach",
    "journal": "Systems Science & Control Engineering, 5(1), 132–139",
    "url": "https://www.tandfonline.com/doi/full/10.1080/21642583.2017.1310635"
  },
  "Mu-Synthesis": {
    "authors": "M. S. Akram, K. Anam, & M. U. Farooq (2024)",
    "title": "A Review on Mathematical Methods to Approximate µ−Values",
    "journal": "Mathematical Methods in the Applied Sciences / Semantic Scholar",
    "url": "https://pdfs.semanticscholar.org/9baf/4868794f9f3d9caf0560a1ac17d499dd7c3a.pdf"
  },
  "LoopShaping-McFarlane": {
    "authors": "S. Bansal & B. Sharma (2014)",
    "title": "Design and Analysis of Robust H-infinity Controller",
    "journal": "International Journal of Engineering Research & Technology (IJERT)",
    "url": "https://www.semanticscholar.org/paper/Design-and-Analysis-of-Robust-H-infinity-Controller-Bansa-Sharma/b09cd9cbcba840ce032c6a93ab0bdc0c2dc99568"
  },
  "Kharitonov-Robust": {
    "authors": "V. L. Kharitonov (1978)",
    "title": "Asymptotic Stability of an Equilibrium Position of a Family of Systems of Linear Differential Equations",
    "journal": "Differentsial’nye Uravneniya, 14(11), 2086–2088",
    "url": "https://doi.org/10.1016/S1474-6670(17)54158-0"
  },
  "Corless-Leitmann": {
    "authors": "M. J. Corless & G. Leitmann (1981)",
    "title": "Continuous State Feedback Guaranteeing Uniform Ultimate Boundedness for Uncertain Dynamic Systems",
    "journal": "IEEE Transactions on Automatic Control, 26(5), 1139–1144",
    "url": "https://www.researchgate.net/publication/3029188_Continous_State_Feedback_Guaranteeing_Uniform_Ultimate_Boundedness_for_Uncertain_Dynamic_Systems"
  },
  "Robust-NL-Damping": {
    "authors": "Y. Liu, X. Zhang, & H. Wang (2023)",
    "title": "Neural Network, Nonlinear-Fitting, Sliding Mode, Event-Triggered Control under Abnormal Signal Input",
    "journal": "Journal of Marine Science and Engineering, 11(3), 659",
    "url": "https://www.mdpi.com/2077-1312/11/3/659"
  },
  "MPC": {
    "authors": "D. Q. Mayne, J. B. Rawlings, C. V. Rao, & P. O. M. Scokaert (2000)",
    "title": "Constrained Model Predictive Control: Stability and Optimality",
    "journal": "Automatica, 36(6), 789–814",
    "url": "https://experts.illinois.edu/en/publications/constrained-model-predictive-control-stability-and-optimality/"
  },
  "TubeMPC": {
    "authors": "D. Q. Mayne, M. M. Seron, & S. V. Raković (2005)",
    "title": "Robust Model Predictive Control of Constrained Linear Systems With Bounded Disturbances",
    "journal": "Automatica, 41(2), 219–224",
    "url": "https://openresearch.newcastle.edu.au/articles/journal_contribution/Robust_model_predictive_control_of_constrained_linear_systems_with_bounded_disturbances/29028086"
  },
  "GPC": {
    "authors": "D. W. Clarke, C. Mohtadi, & P. S. Tuffs (1987)",
    "title": "Generalized Predictive Control—Part I. The Basic Algorithm",
    "journal": "Automatica, 23(2), 137–148",
    "url": "https://www.scilit.com/publications/fee2d984406aa0e996cd79c59a800988"
  },
  "DMC-DynamicMatrix": {
    "authors": "C. R. Cutler & B. L. Ramaker (1980)",
    "title": "Dynamic Matrix Control — A Computer Control Algorithm",
    "journal": "Proceedings of the Joint Automatic Control Conference (JACC)",
    "url": "https://skoge.folk.ntnu.no/puublications_others/1980_Cutler-Ramaker_Dynamic-matrix-control_JACC1980.pdf"
  },
  "MAC-Impulse": {
    "authors": "J. Richalet, A. Rault, J. L. Testud, & J. Papon (1978)",
    "title": "Model predictive heuristic control: Applications to industrial processes",
    "journal": "Automatica, 14(5), 413–428",
    "url": "https://www.semanticscholar.org/paper/Model-predictive-heuristic-control%3A-Applications-to-Richalet-Rault/70941389f729abf387d8f480009395767675bf8d"
  },
  "PFC-Functional": {
    "authors": "J. Richalet & D. O’Donovan (2009)",
    "title": "Predictive Functional Control: Principles and Industrial Applications",
    "journal": "Springer Advances in Industrial Control",
    "url": "https://www.researchgate.net/publication/259124422_Predictive_Functional_Control"
  },
  "Explicit-MPC": {
    "authors": "A. Bemporad, M. Morari, V. Dua, & E. N. Pistikopoulos (2002)",
    "title": "The Explicit Linear Quadratic Regulator for Constrained Systems",
    "journal": "Automatica, 38(1), 3–20",
    "url": "https://cse.lab.imtlucca.it/~bemporad/publications/papers/automatica-mpqp.pdf"
  },
  "Stochastic-MPC": {
    "authors": "A. Mesbah (2016)",
    "title": "Stochastic Model Predictive Control: An Overview and Perspectives for Future Research",
    "journal": "IEEE Control Systems Magazine, 36(6), 30–44",
    "url": "https://www.semanticscholar.org/paper/Stochastic-Model-Predictive-Control%3A-An-Overview-Mesbah/b9a97f803251a491e5964e4ac2f07b33bd9f14c9"
  },
  "SMC": {
    "authors": "V. I. Utkin (1977)",
    "title": "Variable Structure Systems With Sliding Modes",
    "journal": "IEEE Transactions on Automatic Control, 22(2), 212–222",
    "url": "https://www.semanticscholar.org/paper/Variable-structure-systems-with-sliding-modes-Utkin/bda9b2d8887e4ebcbd6cdfbc174fc4ecd91036e8"
  },
  "VSC-RL": {
    "authors": "J. Y. Hung, W. Gao, & J. C. Hung (1993)",
    "title": "Variable structure control: a survey",
    "journal": "IEEE Transactions on Industrial Electronics, 40(1), 2–22",
    "url": "https://www.semanticscholar.org/paper/Variable-structure-control%3A-a-survey-Hung-Gao/8a0c71aac9ea5e71d202d21f83f00c940bffa27d"
  },
  "PowerRate-SMC": {
    "authors": "W. Gao, Y. Wang, & A. Homaifa (1995)",
    "title": "Discrete-time variable structure control systems",
    "journal": "IEEE Transactions on Industrial Electronics, 42(2), 117–122",
    "url": "https://www.semanticscholar.org/paper/Discrete-time-variable-structure-control-systems-Gao-Wang/262726549009241773eb71c74d3caa934ea99c1a"
  },
  "ISMC": {
    "authors": "V. Utkin & J. Shi (1996)",
    "title": "Integral Sliding Mode in Systems Operating Under Uncertainty Conditions",
    "journal": "Proceedings of the 35th IEEE Conference on Decision and Control (CDC), 4591–4596",
    "url": "https://www.semanticscholar.org/paper/Integral-sliding-mode-in-systems-operating-under-Utkin-Shi/a7788ef1f603622c274664539ff6dae1de112c41"
  },
  "TSMC": {
    "authors": "S. Chanda & P. Gogoi (2014)",
    "title": "Trajectory Tracking of a 2-Link Robotic Manipulator Using Adaptive Terminal Sliding Mode Controller",
    "journal": "International Journal of Scientific Engineering and Research (IJSER), 2(3), 1–5",
    "url": "https://pdfs.semanticscholar.org/7a45/39d51c846958fd60eb6306190475584b7190.pdf"
  },
  "FTSMC": {
    "authors": "A. T. Vo, T. N. Truong, & H.-J. Kang (2019)",
    "title": "Fast terminal sliding mode tracking control of nonlinear uncertain mass-spring system with experimental verifications",
    "journal": "International Journal of Advanced Robotic Systems, 16(1), 1–12",
    "url": "https://www.researchgate.net/publication/330738970_Fast_terminal_sliding_mode_tracking_control_of_nonlinear_uncertain_mass-spring_system_with_experimental_verifications"
  },
  "NFTSMC": {
    "authors": "J. He & C. Liu (2014)",
    "title": "Nonsingular Fast Terminal Sliding Mode Control with Extended State Observer for Permanent Magnet Synchronous Motor",
    "journal": "Mathematical Problems in Engineering, 2014, 1–10",
    "url": "https://www.semanticscholar.org/paper/Nonsingular-Fast-Terminal-Sliding-Mode-Control-with-He-Liu/245de0f94c2d8245947e8f4369cec95fc087b664"
  },
  "ASMC": {
    "authors": "Z. Feng & J. Fei (2018)",
    "title": "Design and analysis of adaptive Super-Twisting sliding mode control for a microgyroscope",
    "journal": "PLOS ONE, 13(1), e0189457",
    "url": "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0189457"
  },
  "SuperTwisting": {
    "authors": "A. Levant (1993)",
    "title": "Sliding order and sliding accuracy in sliding mode control",
    "journal": "International Journal of Control, 58(6), 1247–1263",
    "url": "https://www.researchgate.net/publication/239064283_Sliding_order_and_sliding_accuracy_in_sliding_mode_control"
  },
  "Twisting-2SMC": {
    "authors": "A. Levant (2007)",
    "title": "Principles of 2-sliding mode design",
    "journal": "Automatica, 43(4), 576–586",
    "url": "https://www.semanticscholar.org/paper/Principles-of-2-sliding-mode-design-Levant/4bdedd47206b997a894254fe508d4707ba0e3494"
  },
  "LevantHOSM": {
    "authors": "A. Levant (2003)",
    "title": "Higher-order sliding modes, differentiation and output-feedback control",
    "journal": "International Journal of Control, 76(9-10), 924–941",
    "url": "https://www.semanticscholar.org/paper/Higher-order-sliding-modes%2C-differentiation-and-Levant/0537743972b2850b3ca4776716ff5b543b6eaa6a"
  },
  "VariableG-SMC": {
    "authors": "T. Gonzalez, J. A. Moreno, & L. Fridman (2012)",
    "title": "Variable Gain Super-Twisting Sliding Mode Control",
    "journal": "IEEE Transactions on Automatic Control, 57(8), 2100–2105",
    "url": "https://www.semanticscholar.org/paper/Variable-Gain-Super-Twisting-Sliding-Mode-Control-Gonzalez-Moreno/bcb2e0ca7c60156aef2a15cb32d95e2614aee036"
  },
  "ADRC": {
    "authors": "Z. Gao (2003)",
    "title": "Scaling and bandwidth-parameterization based controller tuning",
    "journal": "Proceedings of the 2003 American Control Conference (ACC), 4989–4996",
    "url": "http://congres.cran.univ-lorraine.fr/2003/ACC%202003/Papers/FP03-3.PDF"
  },
  "NL-ADRC": {
    "authors": "J. Han (2009)",
    "title": "From PID to Active Disturbance Rejection Control",
    "journal": "IEEE Transactions on Industrial Electronics, 56(3), 900–906",
    "url": "https://www.semanticscholar.org/paper/From-PID-to-Active-Disturbance-Rejection-Control-Han/e18dbe93dc0c0a3b22559b08fb04d94f481aad3a"
  },
  "DOB": {
    "authors": "E. Sariyildiz, R. Oboe, & K. Ohnishi (2020)",
    "title": "Disturbance Observer-Based Robust Control and Its Applications: 35th Anniversary Overview",
    "journal": "IEEE Transactions on Industrial Electronics, 67(3), 2042–2053",
    "url": "https://arxiv.org/pdf/1902.09032"
  },
  "NDOB": {
    "authors": "W.-H. Chen, D. J. Ballance, P. J. Gawthrop, & J. O’Reilly (2000)",
    "title": "A Nonlinear Disturbance Observer for Robotic Manipulators",
    "journal": "IEEE Transactions on Industrial Electronics, 47(4), 932–938",
    "url": "https://www.researchgate.net/publication/3217709_A_nonlinear_disturbance_observer_for_robotic_manipulators"
  },
  "T-DOB": {
    "authors": "H. Kim, J. Park, & K. Youcef-Toumi (2025)",
    "title": "A Hybrid Robust Time-Delay Control Framework With Integrated Disturbance Observer and Adaptive Sliding Mode Control for Robot Manipulators",
    "journal": "IEEE/ASME Transactions on Mechatronics",
    "url": "https://www.researchgate.net/publication/403423195_A_Hybrid_Robust_Time-Delay_Control_Framework_With_Integrated_Disturbance_Observer_and_Adaptive_Sliding_Mode_Control_for_Robot_Manipulators"
  },
  "ESO-SMC": {
    "authors": "S. Song, H. Liu, & J. Wang (2025)",
    "title": "Fuzzy Extended State Observer-Based Sliding Mode Control for an Agricultural Unmanned Helicopter",
    "journal": "Agriculture, 15(3), 306",
    "url": "https://www.mdpi.com/2077-0472/15/3/306"
  },
  "UIO-Feedback": {
    "authors": "J. Chen, R. J. Patton, & H.-Y. Zhang (1996)",
    "title": "Design of Unknown Input Observers and Robust Fault Detection Filters",
    "journal": "International Journal of Control, 63(1), 85–105",
    "url": "https://www.tandfonline.com/doi/abs/10.1080/00207179608921833"
  },
  "GPI-Control": {
    "authors": "M. Fliess, R. Márquez, E. Delaleau, & H. Sira-Ramírez (2002)",
    "title": "Correcteurs proportionnels-intégraux généralisés (Generalized proportional-integral controllers)",
    "journal": "ESAIM: Control, Optimisation and Calculus of Variations, 8, 361–385",
    "url": "https://www.researchgate.net/publication/264966038_Generalized_proportional-integral_controllers_Correcteurs_proportionnels-integraux_generalises"
  },
  "UDE-Control": {
    "authors": "Q.-C. Zhong & D. Rees (2004)",
    "title": "Control of Uncertain LTI Systems Based on an Uncertainty and Disturbance Estimator",
    "journal": "ASME Journal of Dynamic Systems, Measurement, and Control, 126(4), 905–910",
    "url": "https://www.researchgate.net/publication/245373426_Control_of_Uncertain_LTI_Systems_Based_on_an_Uncertainty_and_Disturbance_Estimator"
  },
  "BangBang": {
    "authors": "R. Bellman, I. Glicksberg, & O. Gross (1956)",
    "title": "On the “bang-bang” control problem",
    "journal": "Quarterly of Applied Mathematics, 14(1), 11–18",
    "url": "https://www.semanticscholar.org/paper/On-the-%E2%80%9Cbang-bang%E2%80%9D-control-problem-Bellman-Glicksberg/a7a13760467aca07225dd229aa1e7f7232f525f6"
  },
  "BangBang-Zone": {
    "authors": "J. Choi, H. Park, & W. Chung (2015)",
    "title": "An Improved 2-DOF Proximate Time-Optimal Servomechanism",
    "journal": "IEEE Transactions on Industrial Electronics / SciSpace",
    "url": "https://scispace.com/papers/an-improved-2-dof-proximate-time-optimal-servomechanism-1mt69my57b"
  },
  "Relay": {
    "authors": "K. J. Åström & T. Hägglund (1984)",
    "title": "Automatic Tuning of Simple Regulators with Specifications on Phase and Amplitude Margins",
    "journal": "Automatica, 20(5), 645–651",
    "url": "https://www.semanticscholar.org/paper/Automatic-Tuning-of-Simple-Regulators-%C3%85str%C3%B6m-H%C3%A4gglund/01c4e295112bc465eb0097daca45ab1066f7adda"
  },
  "TimeOptimal": {
    "authors": "H. Wang, Z. Chen, & Y. Liu (2025)",
    "title": "Time-optimal single-scalar control on a qubit of unitary dynamics",
    "journal": "Physical Review A / arXiv Quantum Physics (arXiv:2504.01785)",
    "url": "https://arxiv.org/abs/2504.01785"
  },
  "FeedbackLin": {
    "authors": "P. Martin & P. Rouchon (1994)",
    "title": "Feedback linearization and driftless systems",
    "journal": "Mathematics of Control, Signals, and Systems, 7(3), 235–254",
    "url": "https://www.semanticscholar.org/paper/Feedback-linearization-and-driftless-systems-Martin-Rouchon/e754caed1d9c94901003330bf40587748d053825"
  },
  "Backstepping": {
    "authors": "C.-F. Chen & J.-C. Juang (2009)",
    "title": "Backstepping control with sum of squares design for omni-directional mobile robots",
    "journal": "Proceedings of the Asian Control Conference (ASCC)",
    "url": "https://www.semanticscholar.org/paper/Backstepping-control-with-sum-of-squares-design-for-Chen-Juang/b1d0fdcd72f07f4eb5198dfe24ff779a8f04f473"
  },
  "DSC": {
    "authors": "D. Swaroop, J. K. Hedrick, P. P. Yip, & J. C. Gerdes (2000)",
    "title": "Dynamic surface control for a class of nonlinear systems",
    "journal": "IEEE Transactions on Automatic Control, 45(10), 1893–1899",
    "url": "https://www.semanticscholar.org/paper/Dynamic-surface-control-for-a-class-of-nonlinear-Swaroop-Hedrick/78ed4d813b898e7cf52fa731b7199b8e42b865c0"
  },
  "NDC": {
    "authors": "M. Krstić, I. Kanellakopoulos, & P. V. Kokotović (1995)",
    "title": "Nonlinear and Adaptive Control Design",
    "journal": "John Wiley & Sons / UCSD Nonlinear Control Lecture Notes",
    "url": "https://flyingv.ucsd.edu/krstic/talks/AdaptiveNonlinear.pdf"
  },
  "EnergyShaping": {
    "authors": "R. Ortega, A. van der Schaft, B. Maschke, & G. Escobar (2002)",
    "title": "Interconnection and Damping Assignment Passivity-Based Control of Port-Controlled Hamiltonian Systems",
    "journal": "Automatica, 38(4), 585–596",
    "url": "https://pure.rug.nl/ws/files/14408405/2002AutomaticaOrtega.pdf"
  },
  "Feedback-Passivation": {
    "authors": "R. Ortega, A. van der Schaft, B. Maschke, & G. Escobar (2002)",
    "title": "Control by Interconnection and Standard Passivity-Based Control of Port-Hamiltonian Systems",
    "journal": "Automatica / IEEE Transactions on Automatic Control",
    "url": "https://www.researchgate.net/publication/224357878_Control_by_Interconnection_and_Standard_Passivity-Based_Control_of_Port-Hamiltonian_Systems"
  },
  "Synergetic-Control": {
    "authors": "A. A. Kolesnikov (2014)",
    "title": "Introduction of synergetic control",
    "journal": "Proceedings of the 2014 American Control Conference (ACC), 3013–3018",
    "url": "https://www.semanticscholar.org/paper/Introduction-of-synergetic-control-Kolesnikov/eba10d880b6a501d92f3b2513fe82e50bc62ac37"
  },
  "SDRE": {
    "authors": "J. R. Cloutier (1997)",
    "title": "State-dependent Riccati equation techniques: an overview",
    "journal": "Proceedings of the 1997 American Control Conference (ACC), 932–936",
    "url": "https://www.semanticscholar.org/paper/State-dependent-Riccati-equation-techniques%3A-an-Cloutier/3cdaead200cd558a5fe6494046d2152b9fd85db9"
  },
  "MRAC": {
    "authors": "T. Yucelen & A. J. Calise (2019)",
    "title": "Model Reference Adaptive Control",
    "journal": "Encyclopedia of Systems and Control, Springer / Semantic Scholar",
    "url": "https://www.semanticscholar.org/paper/Model-Reference-Adaptive-Control-Yucelenand-Calise/1a0fb99087ffd92e7c015d0b29ec15a0d90d60c1"
  },
  "MRAC-MIT": {
    "authors": "P. Jain & M. J. Nigam (2013)",
    "title": "Design of a Model Reference Adaptive Controller Using Modified MIT Rule for a Second Order System",
    "journal": "Advance in Electronic and Electric Engineering, 3(4), 477–484",
    "url": "https://www.semanticscholar.org/paper/Design-of-a-Model-Reference-Adaptive-Controller-MIT-Jain-Nigam/7ea4819f6406bf73f5b41ce07cbc075673f29569/figure/1"
  },
  "STR": {
    "authors": "K. J. Åström (1975)",
    "title": "Self-tuning Regulators : Design Principles and Applications",
    "journal": "Department of Automatic Control, Lund Institute of Technology (TFRT)",
    "url": "https://www.semanticscholar.org/paper/Self-tuning-Regulators-%3A-Design-Principles-and-%C3%85str%C3%B6m/6eed8537114e694ac8aef97246d3647e17080d03"
  },
  "L1": {
    "authors": "M. Krstić, I. Kanellakopoulos, & P. V. Kokotović (1993)",
    "title": "Nonlinear design of adaptive controllers for linear systems",
    "journal": "IEEE Transactions on Automatic Control, 38(9), 1371–1382",
    "url": "https://www.semanticscholar.org/paper/Nonlinear-design-of-adaptive-controllers-for-linear-Krsti%C4%87-Kanellakopoulos/431095332263f83a7f4ce19e6ef6e51b8c643cad"
  },
  "I-and-I": {
    "authors": "A. Astolfi & R. Ortega (2003)",
    "title": "Immersion and Invariance: A New Tool for Stabilization and Adaptive Control of Nonlinear Systems",
    "journal": "IEEE Transactions on Automatic Control, 48(4), 590–606",
    "url": "https://www.researchgate.net/publication/3031435_Immersion_and_invariance_A_new_tool_for_stabilization_and_adaptive_control_of_nonlinear_systems"
  },
  "AdaptBackstepping": {
    "authors": "L. Sonneveldt, Q. P. Chu, & J. A. Mulder (2011)",
    "title": "Adaptive Backstepping Flight Control for Modern Fighter Aircraft",
    "journal": "Advances in Flight Control Systems, InTech, 129–158",
    "url": "https://pdfs.semanticscholar.org/e737/2606372e48e99d23da0b740b69795f8d6f74.pdf"
  },
  "ARC": {
    "authors": "B. Yao & M. Tomizuka (1997)",
    "title": "Adaptive Robust Control of SISO Nonlinear Systems in a Semi-Strict Feedback Form",
    "journal": "Automatica, 33(5), 893–900",
    "url": "https://www.researchgate.net/publication/222343955_Adaptive_Robust_Control_of_SISO_Nonlinear_Systems_in_a_Semi-Strict_Feedback_Form"
  },
  "RLS-Adaptive": {
    "authors": "Y. Wakasa, K. Tanaka, & S. Nakashima (2013)",
    "title": "Online controller tuning via FRIT and recursive least-squares",
    "journal": "Proceedings of the 9th Asian Control Conference (ASCC)",
    "url": "https://www.semanticscholar.org/paper/Online-controller-tuning-via-FRIT-and-recursive-Wakasa-Tanaka/f5544b6bf118b00e2d7692ea30734a6ee632519d"
  },
  "Nussbaum-Gain": {
    "authors": "R. D. Nussbaum (1983)",
    "title": "Some remarks on a conjecture in parameter adaptive control",
    "journal": "Systems & Control Letters, 3(5), 243–246",
    "url": "https://www.researchwithnj.com/en/publications/some-remarks-on-a-conjecture-in-parameter-adaptive-control-2/"
  },
  "Fuzzy": {
    "authors": "E. H. Mamdani (1974)",
    "title": "Application of Fuzzy Algorithms for Control of Simple Dynamic Plant",
    "journal": "Proceedings of the IEE, 121(12), 1585–1588",
    "url": "https://digital-library.theiet.org/doi/10.1049/piee.1974.0328"
  },
  "Neural-RBF-ADRC": {
    "authors": "H. Liu, Y. Wang, & J. Li (2019)",
    "title": "Active Disturbance Rejection Control of Multi-Joint Industrial Robots Based on Dynamic Feedforward",
    "journal": "Electronics, 8(5), 591",
    "url": "https://www.researchgate.net/publication/333407198_Active_Disturbance_Rejection_Control_of_Multi-Joint_Industrial_Robots_Based_on_Dynamic_Feedforward"
  },
  "MFAC": {
    "authors": "Z.-S. Hou & S. Jin (2011)",
    "title": "Data-Driven Model-Free Adaptive Control for a Class of MIMO Nonlinear Discrete-Time Systems",
    "journal": "IEEE Transactions on Neural Networks, 22(12), 2173–2188",
    "url": "https://www.researchgate.net/publication/51858029_Data-Driven_Model-Free_Adaptive_Control_for_a_Class_of_MIMO_Nonlinear_Discrete-Time_Systems"
  },
  "U-Model": {
    "authors": "Q. M. Zhu, W. Zhang, & J. Zhang (2024)",
    "title": "U-control – a universal platform for control system design with showcase examples",
    "journal": "International Journal of Systems Science, 55(15), 3120–3142",
    "url": "https://www.tandfonline.com/doi/full/10.1080/00207721.2024.2395925"
  },
  "ESC": {
    "authors": "M. Krstić (2000)",
    "title": "Performance improvement and limitations in extremum seeking control",
    "journal": "Systems & Control Letters, 39(5), 313–326",
    "url": "https://scispace.com/papers/performance-improvement-and-limitations-in-extremum-seeking-131axf58xd"
  },
  "BELBIC": {
    "authors": "C. Lucas, D. Shahmirzadi, & N. Sheikholeslami (2004)",
    "title": "Introducing BELBIC: Brain Emotional Learning Based Intelligent Controller",
    "journal": "Intelligent Automation & Soft Computing, 10(1), 11–21",
    "url": "https://www.researchgate.net/publication/272123162_Introducing_Belbic_Brain_Emotional_Learning_Based_Intelligent_Controller"
  },
  "Linear-Actor-Critic": {
    "authors": "A. G. Barto, R. S. Sutton, & C. W. Anderson (1983)",
    "title": "Neuronlike Adaptive Elements That Can Solve Difficult Learning Control Problems",
    "journal": "IEEE Transactions on Systems, Man, and Cybernetics, SMC-13(5), 834–846",
    "url": "https://direct.mit.edu/books/edited-volume/chapter-pdf/2299520/c010074_9780262267137.pdf"
  },
  "CMAC-Cerebellar": {
    "authors": "J. S. Albus (1975)",
    "title": "A New Approach to Manipulator Control: The Cerebellar Model Articulation Controller (CMAC)",
    "journal": "ASME Journal of Dynamic Systems, Measurement, and Control, 97(3), 220–227",
    "url": "https://asmedigitalcollection.asme.org/dynamicsystems/article/97/3/220/400927/A-New-Approach-to-Manipulator-Control-The"
  },
  "SPSA-Optimizer": {
    "authors": "J. C. Spall (1992)",
    "title": "Multivariate Stochastic Approximation Using a Simultaneous Perturbation Gradient Approximation",
    "journal": "IEEE Transactions on Automatic Control, 37(3), 332–341",
    "url": "https://www.jhuapl.edu/spsa/pdf-spsa/spall_tac92.pdf"
  },
  "VRFT-DataDriven": {
    "authors": "M. C. Campi, A. Lecchini, & S. M. Savaresi (2002)",
    "title": "Virtual Reference Feedback Tuning: A Direct Method for the Design of Feedback Controllers",
    "journal": "Automatica, 38(8), 1337–1346",
    "url": "https://marco-campi.unibs.it/VRFTwebsite/downloads/Virtual_Refrence_Feedback_Tuning_a%20_direct_method_for_the_design_of_feedback_controllers.pdf"
  },
  "PPC": {
    "authors": "C. P. Bechlioulis & G. A. Rovithakis (2008)",
    "title": "Robust Adaptive Control of Feedback Linearizable MIMO Nonlinear Systems With Prescribed Performance",
    "journal": "IEEE Transactions on Automatic Control, 53(9), 2090–2099",
    "url": "https://www.researchgate.net/publication/224333120_Robust_Adaptive_Control_of_Feedback_Linearizable_MIMO_Nonlinear_Systems_With_Prescribed_Performance"
  },
  "Funnel-Control": {
    "authors": "A. Ilchmann, E. P. Ryan, & C. J. Sangwin (2002)",
    "title": "Tracking with prescribed transient behaviour",
    "journal": "ESAIM: Control, Optimisation and Calculus of Variations, 7, 471–493",
    "url": "https://www.numdam.org/item/COCV_2002__7__471_0/"
  },
  "BLF": {
    "authors": "K. P. Tee, S. S. Ge, & E. H. Tay (2009)",
    "title": "Barrier Lyapunov Functions for the Control of Output-Constrained Nonlinear Systems",
    "journal": "Automatica, 45(4), 918–927",
    "url": "https://www.researchgate.net/publication/222409891_Barrier_Lyapunov_Functions_for_the_control_of_output-constrained_nonlinear_systems"
  },
  "Tan-BLF": {
    "authors": "Z.-L. Tang, K. P. Tee, & H. He (2013)",
    "title": "Tangent Barrier Lyapunov Functions for the Control of Output-Constrained Nonlinear Systems",
    "journal": "IFAC Proceedings Volumes, 46(20), 449–455",
    "url": "https://www.semanticscholar.org/paper/Tangent-Barrier-Lyapunov-Functions-for-the-Control-Tang-Tee/5c0180b0d2289941dcf7527eebbb8f00407efc65"
  },
  "TimeVary-BLF": {
    "authors": "B. Li, S. Wen, Z. Yan, G. Wen, & T. Huang (2023)",
    "title": "A Survey on the Control Lyapunov Function and Control Barrier Function for Nonlinear-Affined Control Systems",
    "journal": "IEEE/CAA Journal of Automatica Sinica, 10(3), 584–602",
    "url": "https://www.ieee-jas.net/article/doi/10.1109/JAS.2023.123075"
  },
  "Integral-BLF": {
    "authors": "J. Wang, Y. Liu, & Z. Li (2024)",
    "title": "Asymmetric integral barrier function-based tracking control of nonlinear systems with full-state constraints",
    "journal": "AIMS Mathematics, 9(1), 319–339",
    "url": "https://www.sciopen.com/local/article_pdf/10.3934/math.2024019.pdf"
  },
  "CBF-QP": {
    "authors": "A. D. Ames, X. Xu, J. W. Grizzle, & P. Tabuada (2017)",
    "title": "Control Barrier Function Based Quadratic Programs for Safety Critical Systems",
    "journal": "IEEE Transactions on Automatic Control, 62(8), 3861–3876",
    "url": "https://arxiv.org/abs/1609.06408"
  },
  "CFTC": {
    "authors": "S. P. Bhat & D. S. Bernstein (1998)",
    "title": "Continuous finite-time stabilization of the translational and rotational double integrators",
    "journal": "IEEE Transactions on Automatic Control, 43(5), 678–682",
    "url": "https://www.semanticscholar.org/paper/Continuous-finite-time-stabilization-of-the-and-Bhat-Bernstein/2965591b7cadbc5027732a2eba73af85d6a61cbc"
  },
  "FxTC": {
    "authors": "A. Polyakov (2012)",
    "title": "Nonlinear Feedback Design for Fixed-Time Stabilization of Linear Control Systems",
    "journal": "IEEE Transactions on Automatic Control, 57(8), 2106–2110",
    "url": "https://www.researchgate.net/publication/260708574_Nonlinear_Feedback_Design_for_Fixed-Time_Stabilization_of_Linear_Control_Systems"
  },
  "PTC": {
    "authors": "Y. Song, Y. Wang, J. Holloway, & M. Krstić (2017)",
    "title": "Time-Varying Feedback for Regulation of Normal-Form Nonlinear Systems in Prescribed Finite Time",
    "journal": "Automatica, 83, 243–251",
    "url": "https://flyingv.ucsd.edu/papers/PDF/266.pdf"
  },
  "InputShaping": {
    "authors": "N. C. Singer & W. P. Seering (1990)",
    "title": "Preshaping Command Inputs to Reduce System Vibration",
    "journal": "ASME Journal of Dynamic Systems, Measurement, and Control, 112(1), 76–82",
    "url": "https://www.semanticscholar.org/paper/Preshaping-Command-Inputs-to-Reduce-System-Singer-Seering/f4047c3fa2d34f4f0f887b9cd40d64bee0d88c97"
  },
  "Posicast": {
    "authors": "O. J. M. Smith (1957)",
    "title": "Posicast Control of Damped Oscillatory Systems",
    "journal": "Proceedings of the IRE, 45(9), 1249–1255",
    "url": "https://www.semanticscholar.org/paper/Posicast-Control-of-Damped-Oscillatory-Systems-Smith/884f3e12e2915ed62f169c2d24295ca5606f7d5b"
  },
  "SmithPredict": {
    "authors": "A. V. Nekhoroshikh & I. B. Furtat (2025)",
    "title": "Modified Smith predictor for unstable linear systems with input delay",
    "journal": "arXiv Systems and Control (arXiv:2507.22243)",
    "url": "https://arxiv.org/abs/2507.22243"
  },
  "Artstein-Reduction": {
    "authors": "Z. Artstein (1982)",
    "title": "Linear Systems With Delayed Controls: A Reduction",
    "journal": "IEEE Transactions on Automatic Control, 27(4), 869–879",
    "url": "https://weizmann.elsevierpure.com/en/publications/linear-systems-with-delayed-controls-a-reduction/"
  },
  "TDC": {
    "authors": "K. Youcef-Toumi & O. Ito (1990)",
    "title": "A Time Delay Controller for Systems With Unknown Dynamics",
    "journal": "ASME Journal of Dynamic Systems, Measurement, and Control, 112(1), 133–142",
    "url": "https://asmedigitalcollection.asme.org/dynamicsystems/article/112/1/133/427748/A-Time-Delay-Controller-for-Systems-With-Unknown"
  },
  "IMC": {
    "authors": "C. E. Garcia & M. Morari (1982)",
    "title": "Internal Model Control: A Unifying Review and Some New Results",
    "journal": "Ind. & Eng. Chem. Process Design and Development, 21(2), 308–323",
    "url": "https://www.scribd.com/doc/296872402/Internal-Model-Control-II-pdf"
  },
  "ILC": {
    "authors": "S. Arimoto, S. Kawamura, & F. Miyazaki (1984)",
    "title": "Bettering operation of Robots by learning",
    "journal": "Journal of Robotic Systems, 1(2), 123–140",
    "url": "https://www.semanticscholar.org/paper/Bettering-operation-of-Robots-by-learning-Arimoto-Kawamura/aa0203418db9f9800f59687e2cb2a58d7b12c97d"
  },
  "Repetitive": {
    "authors": "S. Hara, Y. Yamamoto, T. Omata, & M. Nakano (1988)",
    "title": "Repetitive Control System: A New Type Servo System for Periodic Exogenous Signals",
    "journal": "IEEE Transactions on Automatic Control, 33(7), 659–668",
    "url": "https://www.researchgate.net/publication/3020073_Repetitive_control_system_A_new_type_servo_system_for_periodic_exogenous_signals"
  },
  "GainSched": {
    "authors": "J. S. Shamma & M. Athans (1990)",
    "title": "Analysis of Gain Scheduled Control for Nonlinear Plants",
    "journal": "IEEE Transactions on Automatic Control, 35(8), 898–907",
    "url": "https://experts.illinois.edu/en/publications/analysis-of-gain-scheduled-control-for-nonlinear-plants/"
  },
  "Switched": {
    "authors": "M. Cao & A. S. Morse (2010)",
    "title": "Dwell-Time Switching",
    "journal": "Systems & Control Letters, 59(1), 57–65",
    "url": "https://www.rug.nl/staff/m.cao/2010_switching.pdf"
  },
  "DynPole": {
    "authors": "K. Song, M. Behzadfar, & W.-J. Zhang (2022)",
    "title": "A Dynamic Pole Motion Approach for Control of Nonlinear Hybrid Soft Legs: A Preliminary Study",
    "journal": "Machines, 10(10), 873",
    "url": "https://www.semanticscholar.org/paper/345f3eb95ad45b50c08243fbad6fe24f4248c9ac"
  },
  "ETC": {
    "authors": "P. Tabuada (2007)",
    "title": "Event-Triggered Real-Time Scheduling of Stabilizing Control Tasks",
    "journal": "IEEE Transactions on Automatic Control, 52(9), 1680–1685",
    "url": "https://www.researchgate.net/publication/3032863_Event-Triggered_Real-Time_Scheduling_of_Stabilizing_Control_Tasks"
  },
  "Event-Triggered-MPC": {
    "authors": "Z. Wang, X. Liu, & H. Zhang (2024)",
    "title": "Event-Triggered Disturbance Estimation and Output Feedback Control for Inner-Formation Systems",
    "journal": "Aerospace / Semantic Scholar",
    "url": "https://pdfs.semanticscholar.org/89f4/abebedd309e7ff76696c037e6320dd7e126f.pdf"
  },
  "Quantized-Ctrl": {
    "authors": "R. W. Brockett & D. Liberzon (2000)",
    "title": "Quantized Feedback Stabilization of Linear Systems",
    "journal": "IEEE Transactions on Automatic Control, 45(7), 1279–1289",
    "url": "https://hrl.harvard.edu/publications/brockett00quantized.pdf"
  },
  "Extended-Luenberger": {
    "authors": "G. Ciccarella, M. Dalla Mora, & A. Germani (1993)",
    "title": "A Luenberger-like observer for nonlinear systems",
    "journal": "International Journal of Control, 57(3), 537–556",
    "url": "https://www.semanticscholar.org/paper/A-Luenberger-like-observer-for-nonlinear-systems-Ciccarella-Mora/43bf385128ed5e7890692a868e604145a2561331"
  },
  "EKF-Ctrl": {
    "authors": "N. A. Wagner, D. C. Guastella, & G. Muscato (2015)",
    "title": "A Generalized Extended Kalman Filter Implementation for the Robot Operating System",
    "journal": "International Conference on Informatics in Control, Automation and Robotics",
    "url": "https://www.researchgate.net/publication/284887418_A_Generalized_Extended_Kalman_Filter_Implementation_for_the_Robot_Operating_System"
  },
  "Particle-Filter": {
    "authors": "N. J. Gordon, D. J. Salmond, & A. F. M. Smith (1993)",
    "title": "Novel approach to nonlinear/non-Gaussian Bayesian state estimation",
    "journal": "IEE Proceedings F (Radar and Signal Processing), 140(2), 107–113",
    "url": "https://www.irisa.fr/aspi/legland/ref/gordon93a.pdf"
  },
  "FO-PD": {
    "authors": "I. Podlubny (1999)",
    "title": "Fractional-Order Systems and PIλDμ-Controllers",
    "journal": "IEEE Transactions on Automatic Control, 44(1), 208–214",
    "url": "https://www.semanticscholar.org/paper/Fractional-order-systems-and-PI%CE%BBD%CE%BC-controllers-Podlubny/d16e85b46a326799625f79d09ee407bd7136a946"
  },
  "Nonlinear-Power-ADRC": {
    "authors": "J. Han (2009)",
    "title": "From PID to Active Disturbance Rejection Control",
    "journal": "IEEE Transactions on Industrial Electronics, 56(3), 900–906",
    "url": "https://mechatronics.ucmerced.edu/sites/g/files/ufvvjh1226/f/page/documents/04796887_0.pdf"
  },
  "Implicit-Euler-Ctrl": {
    "authors": "B. Brogliato & A. Tanwani (2020)",
    "title": "Dynamical Systems Coupled with Monotone Set-Valued Operators: Formalisms, Applications, Well-Posedness, and Stability",
    "journal": "SIAM Review, 62(1), 3–129",
    "url": "https://epubs.siam.org/doi/abs/10.1137/18M1234795"
  },
  "Lorenz-Coupled": {
    "authors": "E. N. Lorenz (1963)",
    "title": "Deterministic Nonperiodic Flow",
    "journal": "Journal of the Atmospheric Sciences, 20(2), 130–141",
    "url": "https://journals.ametsoc.org/abstract/journals/atsc/20/2/1520-0469_1963_020_0130_dnf_2_0_co_2.xml"
  },
  "Speed-Gradient": {
    "authors": "M. V. Dolgopolik & A. L. Fradkov (2016)",
    "title": "Speed-Gradient Control of the Brockett Integrator",
    "journal": "SIAM Journal on Control and Optimization, 54(4), 2116–2131",
    "url": "https://epubs.siam.org/doi/10.1137/15M1013456"
  },
  "P-PI-Cascade": {
    "authors": "V. T. Nguyen, C. H. Nguyen, & T. L. Bui (2025)",
    "title": "Cascade Control for Feed Drive Systems",
    "journal": "Journal of Advanced Mechanical Design, Systems, and Manufacturing",
    "url": "https://pdfs.semanticscholar.org/6f81/3f0aead90ba171a82517c97c9b5ac3608dc4.pdf"
  },
  "Bilinear-Tustin-PID": {
    "authors": "K. Smerpitak, P. Ukakimaparn, T. Trisuwannawat, & P. La-orsri (2014)",
    "title": "Bilinear Discrete PID×(n-2) stage PD cascade controller for SISO systems",
    "journal": "International Conference on Control, Automation and Systems (ICCAS)",
    "url": "https://www.semanticscholar.org/paper/Bilinear-Discrete-PID%C3%97(n-2)-stage-PD-cascade-for-Smerpitak-Ukakimaparn/4c3b9d24d9c8a3af1189585f226fad599fe828c8/figure/6"
  },
  "Gain-Margin-PID": {
    "authors": "K. J. Åström & T. Hägglund (1984)",
    "title": "Automatic Tuning of Simple Regulators with Specifications on Phase and Amplitude Margins",
    "journal": "Automatica, 20(5), 645–651",
    "url": "https://lucris.lub.lu.se/ws/files/6340936/8509157.pdf"
  },
  "IMC-PID": {
    "authors": "D. E. Rivera, M. Morari, & S. Skogestad (1986)",
    "title": "Internal Model Control: 4. PID Controller Design",
    "journal": "Ind. & Eng. Chem. Process Design and Development, 25(1), 252–265",
    "url": "https://www.scribd.com/document/135217144/Internal-Model-Control-4-P-I-D-Controller-Design-Rivera-86"
  },
  "LQR-Servo-FF": {
    "authors": "L. Heng, D. Cabecinhas, R. Cunha, & C. Silvestre (2013)",
    "title": "A trajectory tracking LQR controller for a quadrotor: Design and experimental evaluation",
    "journal": "IEEE Aerospace Conference",
    "url": "https://www.semanticscholar.org/paper/A-trajectory-tracking-LQR-controller-for-a-Design-Heng-Cabecinhas/2678a48065b105d7e15e8daf18ce94906c14af20"
  },
  "Linear-Time-Optimal-Switch": {
    "authors": "H. Park, S. Kim, & J. Chang (2019)",
    "title": "Proximate Time-Optimal Servomechanism Based on Transition Curve for Hard Disk Drive",
    "journal": "Applied Sciences, 9(23), 5201",
    "url": "https://www.mdpi.com/2076-3417/9/23/5201"
  },
  "Petersen-GuaranteedCost": {
    "authors": "I. R. Petersen & D. C. McFarlane (1994)",
    "title": "Optimal Guaranteed Cost Control and Filtering for Uncertain Linear Systems",
    "journal": "IEEE Transactions on Automatic Control, 39(9), 1971–1977",
    "url": "https://researchportalplus.anu.edu.au/en/publications/optimal-guaranteed-cost-control-and-filtering-for-uncertain-linea/"
  },
  "Passivity-Shortage-Comp": {
    "authors": "Z. Wang, F. Liu, & S. Mei (2026)",
    "title": "Matrix-Valued Passivity Indices: Foundations, Properties, and Stability Implications",
    "journal": "arXiv Systems and Control (arXiv:2601.04796)",
    "url": "https://arxiv.org/abs/2601.04796"
  },
  "MinMax-MPC": {
    "authors": "P. O. M. Scokaert & D. Q. Mayne (1998)",
    "title": "Min-max feedback model predictive control for constrained linear systems",
    "journal": "IEEE Transactions on Automatic Control, 43(8), 1136–1142",
    "url": "https://scispace.com/papers/min-max-feedback-model-predictive-control-for-constrained-4zn405dg68"
  },
  "Boundary-Layer-Varying-SMC": {
    "authors": "J.-J. E. Slotine & W. Li (1989)",
    "title": "Composite adaptive control of robot manipulators",
    "journal": "Automatica, 25(4), 509–519",
    "url": "https://scispace.com/papers/composite-adaptive-control-of-robot-manipulators-4lyectz6zk"
  },
  "Global-SMC": {
    "authors": "H. Li, J. Wang, & P. Shi (2014)",
    "title": "A Discrete-Time Global Quasi-Sliding Mode Control Scheme with Bounded External Disturbance Rejection",
    "journal": "Asian Journal of Control, 16(6), 1732–1741",
    "url": "https://www.semanticscholar.org/paper/3b4df228b5106d90ff01a2500089ef90db00d4c6"
  },
  "HOSM-Quasi-Continuous": {
    "authors": "A. Polyakov, D. Efimov, & B. Brogliato (2019)",
    "title": "Consistent Discretization of Finite-Time and Fixed-Time Stable Systems",
    "journal": "SIAM Journal on Control and Optimization, 57(1), 78–103",
    "url": "https://epubs.siam.org/doi/10.1137/18M1197345"
  },
  "Active-Force-Control": {
    "authors": "M. Mailah & J. R. Hewit (2018)",
    "title": "Intelligent Active Force Control of a Rigid Robot Arm Using Neural Network and Iterative Learning Algorithms",
    "journal": "Jurnal Mekanikal, 41(1), 1–16",
    "url": "https://jurnalmekanikal.utm.my/index.php/jurnalmekanikal/article/view/271"
  },
  "Equivalent-Input-Disturbance": {
    "authors": "J. She, M. Fang, & Y. Ohyama (2008)",
    "title": "Improving Disturbance-Rejection Performance Based on an Equivalent-Input-Disturbance Approach",
    "journal": "IEEE Transactions on Industrial Electronics, 55(1), 380–389",
    "url": "https://www.researchgate.net/publication/3219709_Improving_Disturbance-Rejection_Performance_Based_on_an_Equivalent-Input-Disturbance_Approach"
  },
  "Harmonic-Oscillator-PBC": {
    "authors": "R. Ortega, A. van der Schaft, B. Maschke, & G. Escobar (2002)",
    "title": "Interconnection and damping assignment passivity-based control of port-controlled Hamiltonian systems",
    "journal": "Automatica, 38(4), 585–596",
    "url": "https://research.utwente.nl/en/publications/interconnection-and-damping-assignment-passivity-based-control-of/"
  },
  "Flatness-Trajectory-Track": {
    "authors": "M. Fliess, J. Lévine, P. Martin, & P. Rouchon (1995)",
    "title": "Flatness and Defect of Non-Linear Systems: Introductory Theory and Examples",
    "journal": "International Journal of Control, 61(6), 1327–1361",
    "url": "https://www.tandfonline.com/doi/abs/10.1080/00207179508921959"
  },
  "Composite-MRAC": {
    "authors": "J.-J. E. Slotine & W. Li (1989)",
    "title": "Composite Adaptive Control of Robot Manipulators",
    "journal": "Automatica, 25(4), 509–519",
    "url": "https://www.semanticscholar.org/paper/Composite-adaptive-control-of-robot-manipulators-Slotine-Li/638926880227ce664ad62127502f269ceb86359e"
  }
};
  const verification = {
  "P": {
    "key": "P",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Optimum Settings for Automatic Controllers（1942），DOI 10.1115/1.4019264，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "PI": {
    "key": "PI",
    "status": "verified",
    "reason": "Crossref 权威题录命中：PID control system analysis, design, and technology（2005），DOI 10.1109/tcst.2005.847331，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "PD": {
    "key": "PD",
    "status": "verified",
    "reason": "Crossref 权威题录命中：PID control system analysis and design（2006），DOI 10.1109/mcs.2006.1580152，题名相似度 0.714。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "PID": {
    "key": "PID",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Optimum Settings for Automatic Controllers（1993），DOI 10.1115/1.2899060，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "IncPID": {
    "key": "IncPID",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Patents, software, and hardware for PID control: an overview and analysis of the current art（2006），DOI 10.1109/mcs.2006.1580153，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "IPD": {
    "key": "IPD",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Two-Degree-of-Freedom PID Controllers Structures（2016），DOI 10.1007/978-3-319-28213-8_2，题名相似度 0.909。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "PI-D": {
    "key": "PI-D",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Two-Degree-of-Freedom PID Controllers Structures（2016），DOI 10.1007/978-3-319-28213-8_2，题名相似度 0.909。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "2DOF-PID": {
    "key": "2DOF-PID",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Two-Degree-of-Freedom PID Controllers — Their Functions and Optimal Tuning（2000），DOI 10.1016/s1474-6670(17)38226-5，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Nested-PID": {
    "key": "Nested-PID",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Design of PID controller for cascade control process using genetic algorithm（2017），DOI 10.1109/iccons.2017.8250634，题名相似度 0.778。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "AW-PI": {
    "key": "AW-PI",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Tracking Time Adjustment In Back Calculation Anti-Windup Scheme（2006），DOI 10.7148/2006-0613，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Clamping-PID": {
    "key": "Clamping-PID",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Modified anti-windup scheme for PID controllers（2003），DOI 10.1049/ip-cta:20020769，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Sep-Int-PID": {
    "key": "Sep-Int-PID",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Analytical approach for novel digital PID control switching power supply（2015），DOI 10.1109/icit.2015.7125457，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "VarRate-PID": {
    "key": "VarRate-PID",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Steady-State Integral Proportional Integral Controller for PI Motor Speed Controllers（2015），DOI 10.6113/jpe.2015.15.1.177，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "FilterD-PID": {
    "key": "FilterD-PID",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Derivative filter is an integral part of PID design（2002），DOI 10.1049/ip-cta:20020111，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Deadband-PID": {
    "key": "Deadband-PID",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Simple PID control algorithm adapted to deadband sampling（2007），DOI 10.1109/efta.2007.4416884，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "RampSP-PID": {
    "key": "RampSP-PID",
    "status": "verified",
    "reason": "Crossref 权威题录命中：An online dynamic set point weighting scheme for PID controller（2014），DOI 10.1109/techsym.2014.6808044，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Expert-PID": {
    "key": "Expert-PID",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Towards intelligent PID control（1992），DOI 10.1016/0005-1098(92)90002-w，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "NPID": {
    "key": "NPID",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Design of an enhanced nonlinear PID controller（2005），DOI 10.1016/j.mechatronics.2005.03.003，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "FuzzyPID": {
    "key": "FuzzyPID",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Fuzzy gain scheduling of PID controllers（1993），DOI 10.1109/21.260670，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "NeuralPID": {
    "key": "NeuralPID",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Single Neuron PID Model Reference Adaptive Control Based on RBF Neural Network（2006），DOI 10.1109/icmlc.2006.258358，题名相似度 0.909。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Gradient-PID": {
    "key": "Gradient-PID",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Iterative feedback tuning: theory and applications（1998），DOI 10.1109/37.710876，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "iPID": {
    "key": "iPID",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Model-Free Adaptive Predictive Control（2013），DOI 10.1201/b15752-11，题名相似度 0.75。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "OpenLoop": {
    "key": "OpenLoop",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Adaptive closed-loop control of a single-link flexible manipulator（2012），DOI 10.1177/1077546312453066，题名相似度 0.706。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "QFT-LeadLag": {
    "key": "QFT-LeadLag",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Quantitative feedback theory based robust speed control of vector controlled induction motor（2023），DOI 10.11591/eei.v12i1.4927，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Lag-Compensator": {
    "key": "Lag-Compensator",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Lead-Lag Compensator Design Based on Genetic Algorithms（2012），DOI 10.1109/taai.2012.66，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Lead-Lag-Full": {
    "key": "Lead-Lag-Full",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Analytical Design of Lead-Lag Compensators on Nyquist and Nichols planes（2011），DOI 10.3182/20110828-6-it-1002.02758，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Notch-Filter-PD": {
    "key": "Notch-Filter-PD",
    "status": "suspect",
    "reason": "两轮 Crossref 检索最佳相似度 0.53；Singhose 的输入整形/陷波工作确实存在，但题名与所标「Input Shaping and Notch Filtering of Oscillatory Mechanical Modes」未精确对上。需人工核对确切题名。",
    "checkedAt": "2026-11-14"
  },
  "PR-Resonant": {
    "key": "PR-Resonant",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Proportional-resonant controllers and filters for grid-connected voltage-source converters（2006），DOI 10.1049/ip-epa:20060008，题名相似度 0.875。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Double-Int-Servo": {
    "key": "Double-Int-Servo",
    "status": "verified",
    "reason": "Crossref 权威题录命中：The internal model principle of control theory（1976），DOI 10.1016/0005-1098(76)90006-6，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "PIDA-Controller": {
    "key": "PIDA-Controller",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Analytic PIDA controller design technique for a third order system，DOI 10.1109/cdc.1996.573472，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Bode-Step-Comp": {
    "key": "Bode-Step-Comp",
    "status": "verified",
    "reason": "Crossref 权威题录命中：A novel improved arithmetic optimization algorithm for optimal design of PID controlled and Bode’s ideal transfer function based automobile cruise control system（2021），DOI 10.1007/s12530-021-09402-4，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Two-Stage-Lead": {
    "key": "Two-Stage-Lead",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Novel Analytic Technique for PID and PIDA Controller Design（1996），DOI 10.1016/s1474-6670(17)57819-2，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "PolePlacement": {
    "key": "PolePlacement",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Pole Placement Based State Feedback for DC Motor Position Control（2021），DOI 10.1088/1742-6596/1783/1/012057，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "LQR": {
    "key": "LQR",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Contributions to the Theory of Optimal Control（2009），DOI 10.1109/9780470544334.ch8，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "LQG": {
    "key": "LQG",
    "status": "verified",
    "reason": "Crossref 权威题录命中：A New Approach to Linear Filtering and Prediction Problems（1960），DOI 10.1115/1.3662552，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "LQR-I": {
    "key": "LQR-I",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Linear quadratic integral (LQI) control for a small scale turbojet engine with variable exhaust nozzle（2017），DOI 10.1109/miltechs.2017.7988811，题名相似度 0.857。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Deadbeat": {
    "key": "Deadbeat",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Modeling and simulation of deadbeat-based PI controller in a single-phase H-bridge inverter for stand-alone applications（2014），DOI 10.3906/elk-1206-45，题名相似度 0.762。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "IMP-Servo": {
    "key": "IMP-Servo",
    "status": "verified",
    "reason": "Crossref 权威题录命中：The internal model principle of control theory（1976），DOI 10.1016/0005-1098(76)90006-6，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Preview": {
    "key": "Preview",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Optimum Linear Preview Control With Application to Vehicle Suspension（1968），DOI 10.1115/1.3605082，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Kalman-Pole": {
    "key": "Kalman-Pole",
    "status": "verified",
    "reason": "Crossref 权威题录命中：A New Approach to Linear Filtering and Prediction Problems（1960），DOI 10.1115/1.3662552，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Minimum-Energy": {
    "key": "Minimum-Energy",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Minimum energy and maximum accuracy optimal control of linear stochastic systems（1975），DOI 10.1080/00207177508922064，题名相似度 0.8。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "LQT-Tracking": {
    "key": "LQT-Tracking",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Data-driven linear quadratic tracking based temperature control of a big area additive manufacturing system（2024），DOI 10.1007/s10845-024-02428-w，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "H-Infinity": {
    "key": "H-Infinity",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Nonlinear State Space H ∞ Control Theory（1993），DOI 10.1007/978-1-4612-0313-1_6，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "H2-Optimal": {
    "key": "H2-Optimal",
    "status": "verified",
    "reason": "Crossref 权威题录命中：The &lt;inline-formula&gt; &lt;tex-math notation=\"TeX\"&gt;${\\cal H}_{2} $&lt;/tex-math&gt;&lt;/inline-formula&gt; Control Problem for Quadratically Invariant Systems With Delays（2015），DOI 10.1109/tac.2014.2363917，题名相似度 0.667。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Mixed-H2-Hinf": {
    "key": "Mixed-H2-Hinf",
    "status": "verified",
    "reason": "Crossref 权威题录命中：<i>H</i><sub>2</sub>−<i>H</i><sub>∞</sub> control of discrete-time nonlinear systems using the state-dependent Riccati equation approach（2017），DOI 10.1080/21642583.2017.1310635，题名相似度 0.957。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Mu-Synthesis": {
    "key": "Mu-Synthesis",
    "status": "verified",
    "reason": "Crossref 权威题录命中：A Review on Mathematical Methods to Approximate µ-Values（2024），DOI 10.28924/2291-8639-22-2024-232，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "LoopShaping-McFarlane": {
    "key": "LoopShaping-McFarlane",
    "status": "verified",
    "reason": "Crossref 权威题录命中：An H-infinity/LTR method for robust controller design（1991），DOI 10.2514/6.1991-2732，题名相似度 0.727。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Kharitonov-Robust": {
    "key": "Kharitonov-Robust",
    "status": "suspect",
    "reason": "Kharitonov 1978 原文发表于俄文期刊 Differentsial’nye Uravneniya 14(11):2086–2088，未被 Crossref 完整收录（两轮检索最佳相似度 0.47）。属「权威源未收录」而非虚假引用，需人工按原刊核对。",
    "checkedAt": "2026-11-14"
  },
  "Corless-Leitmann": {
    "key": "Corless-Leitmann",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Continuous state feedback guaranteeing uniform ultimate boundedness for uncertain dynamic systems（1981），DOI 10.1109/tac.1981.1102785，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Robust-NL-Damping": {
    "key": "Robust-NL-Damping",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Neural Network, Nonlinear-Fitting, Sliding Mode, Event-Triggered Control under Abnormal Input for Port Artificial Intelligence Transportation Robots（2023），DOI 10.3390/jmse11030659，题名相似度 0.8。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "MPC": {
    "key": "MPC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Constrained model predictive control: Stability and optimality（2000），DOI 10.1016/s0005-1098(99)00214-9，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "TubeMPC": {
    "key": "TubeMPC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Robust model predictive control of constrained linear systems with bounded disturbances（2005），DOI 10.1016/j.automatica.2004.08.019，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "GPC": {
    "key": "GPC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Generalized predictive control—Part I. The basic algorithm（1987），DOI 10.1016/0005-1098(87)90087-2，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "DMC-DynamicMatrix": {
    "key": "DMC-DynamicMatrix",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Dynamic Matrix Control: The Basic Algorithm（2026），DOI 10.1002/9781394333325.ch03，题名相似度 0.8。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "MAC-Impulse": {
    "key": "MAC-Impulse",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Model predictive heuristic control（1978），DOI 10.1016/0005-1098(78)90001-8，题名相似度 0.727。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "PFC-Functional": {
    "key": "PFC-Functional",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Industrial applications of predictive functional control to metallurgical industries，DOI 10.1109/cca.1995.555880，题名相似度 0.769。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Explicit-MPC": {
    "key": "Explicit-MPC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：The explicit linear quadratic regulator for constrained systems（2002），DOI 10.1016/s0005-1098(01)00174-1，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Stochastic-MPC": {
    "key": "Stochastic-MPC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Stochastic Model Predictive Control: An Overview and Perspectives for Future Research（2016），DOI 10.1109/mcs.2016.2602087，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "SMC": {
    "key": "SMC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Variable structure systems with sliding modes（1977），DOI 10.1109/tac.1977.1101446，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "VSC-RL": {
    "key": "VSC-RL",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Variable structure control: a survey（1993），DOI 10.1109/41.184817，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "PowerRate-SMC": {
    "key": "PowerRate-SMC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Discrete-time variable structure control systems（1995），DOI 10.1109/41.370376，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "ISMC": {
    "key": "ISMC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Integral sliding mode in systems operating under uncertainty conditions，DOI 10.1109/cdc.1996.577594，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "TSMC": {
    "key": "TSMC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Trajectory Tracking of a 2-Link Robotic Manipulator Using Adaptive Terminal Sliding Mode Controller（2014），DOI 10.70729/j2013152，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "FTSMC": {
    "key": "FTSMC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Fast terminal sliding mode tracking control of nonlinear uncertain mass–spring system with experimental verifications（2019），DOI 10.1177/1729881419828176，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "NFTSMC": {
    "key": "NFTSMC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Improved Non-Singular Fast Terminal Sliding Mode Control of Permanent Magnet Synchronous Motor Based on Extended State Observer（2025），DOI 10.2139/ssrn.5199381，题名相似度 0.828。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "ASMC": {
    "key": "ASMC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Design and analysis of adaptive Super-Twisting sliding mode control for a microgyroscope（2018），DOI 10.1371/journal.pone.0189457，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "SuperTwisting": {
    "key": "SuperTwisting",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Sliding order and sliding accuracy in sliding mode control（1993），DOI 10.1080/00207179308923053，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Twisting-2SMC": {
    "key": "Twisting-2SMC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Principles of 2-sliding mode design（2007），DOI 10.1016/j.automatica.2006.10.008，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "LevantHOSM": {
    "key": "LevantHOSM",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Higher-order sliding modes, differentiation and output-feedback control（2003），DOI 10.1080/0020717031000099029，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "VariableG-SMC": {
    "key": "VariableG-SMC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Variable Gain Super-Twisting Sliding Mode Control（2012），DOI 10.1109/tac.2011.2179878，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "ADRC": {
    "key": "ADRC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Scaling and bandwidth-parameterization based controller tuning，DOI 10.1109/acc.2003.1242516，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "NL-ADRC": {
    "key": "NL-ADRC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：From PID to Active Disturbance Rejection Control（2009），DOI 10.1109/tie.2008.2011621，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "DOB": {
    "key": "DOB",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Disturbance Observer-Based Robust Control and Its Applications: 35th Anniversary Overview（2020），DOI 10.1109/tie.2019.2903752，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "NDOB": {
    "key": "NDOB",
    "status": "verified",
    "reason": "Crossref 权威题录命中：A nonlinear disturbance observer for robotic manipulators（2000），DOI 10.1109/41.857974，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "T-DOB": {
    "key": "T-DOB",
    "status": "verified",
    "reason": "Crossref 权威题录命中：A Hybrid Robust Time-Delay Control Framework With Integrated Disturbance Observer and Adaptive Sliding Mode Control for Robot Manipulators（2026），DOI 10.1109/tie.2026.3675068，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "ESO-SMC": {
    "key": "ESO-SMC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Fuzzy Extended State Observer-Based Sliding Mode Control for an Agricultural Unmanned Helicopter（2025），DOI 10.3390/agriculture15030306，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "UIO-Feedback": {
    "key": "UIO-Feedback",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Design of unknown input observers and robust fault detection filters（1996），DOI 10.1080/00207179608921833，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "GPI-Control": {
    "key": "GPI-Control",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Correcteurs proportionnels-intégraux généralisés（2002），DOI 10.1051/cocv:2002002，题名相似度 0.714。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "UDE-Control": {
    "key": "UDE-Control",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Control of Uncertain LTI Systems Based on an Uncertainty and Disturbance Estimator（2004），DOI 10.1115/1.1850529，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "BangBang": {
    "key": "BangBang",
    "status": "verified",
    "reason": "Crossref 权威题录命中：On the “bang-bang” control problem（1956），DOI 10.1090/qam/78516，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "BangBang-Zone": {
    "key": "BangBang-Zone",
    "status": "verified",
    "reason": "Crossref 权威题录命中：An Improved 2-DOF Proximate Time Optimal Servomechanism（2009），DOI 10.1109/tmag.2009.2013247，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Relay": {
    "key": "Relay",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Automatic tuning of simple regulators with specifications on phase and amplitude margins（1984），DOI 10.1016/0005-1098(84)90014-1，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "TimeOptimal": {
    "key": "TimeOptimal",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Time-optimal single-scalar control on a qubit of unitary dynamics（2025），DOI 10.1103/physreva.111.042602，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "FeedbackLin": {
    "key": "FeedbackLin",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Feedback linearization and driftless systems（1994），DOI 10.1007/bf01212271，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Backstepping": {
    "key": "Backstepping",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Backstepping Control Design on the Dynamics of the Omni-Directional Mobile Robot（2012），DOI 10.4028/www.scientific.net/amm.203.51，题名相似度 0.706。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "DSC": {
    "key": "DSC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Dynamic surface control for a class of nonlinear systems（2000），DOI 10.1109/tac.2000.880994，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "NDC": {
    "key": "NDC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：NONLINEAR ADAPTIVE FILTERS: DESIGN AND APPLICATION（1995），DOI 10.1016/b978-0-08-042375-3.50007-x，题名相似度 0.667。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "EnergyShaping": {
    "key": "EnergyShaping",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Interconnection and damping assignment passivity-based control of port-controlled Hamiltonian systems（2002），DOI 10.1016/s0005-1098(01)00278-3，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Feedback-Passivation": {
    "key": "Feedback-Passivation",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Control by Interconnection and Standard Passivity-Based Control of Port-Hamiltonian Systems（2008），DOI 10.1109/tac.2008.2006930，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Synergetic-Control": {
    "key": "Synergetic-Control",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Introduction of synergetic control（2014），DOI 10.1109/acc.2014.6859397，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "SDRE": {
    "key": "SDRE",
    "status": "verified",
    "reason": "Crossref 权威题录命中：State-dependent Riccati equation techniques: an overview（1997），DOI 10.1109/acc.1997.609663，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "MRAC": {
    "key": "MRAC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Model Reference Adaptive Control（2019），DOI 10.1007/978-3-030-05879-1_17，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "MRAC-MIT": {
    "key": "MRAC-MIT",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Fractional-order model reference adaptive controller design using a modified MIT rule and a feed-forward action for a DC-DC boost converter stabilization（2017），DOI 10.1109/icee-b.2017.8192132，题名相似度 0.69。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "STR": {
    "key": "STR",
    "status": "verified",
    "reason": "Crossref 权威题录命中：SELF-TUNING REGULATORS - DESIGN PRINCIPLES AND APPLICATIONS（1980），DOI 10.1016/b978-0-12-514060-7.50006-3，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "L1": {
    "key": "L1",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Nonlinear design of adaptive controllers for linear systems（1994），DOI 10.1109/9.286250，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "I-and-I": {
    "key": "I-and-I",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Immersion and invariance: a new tool for stabilization and adaptive control of nonlinear systems（2003），DOI 10.1109/tac.2003.809820，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "AdaptBackstepping": {
    "key": "AdaptBackstepping",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Adaptive Backstepping Flight Control for Modern Fighter Aircraft（2011），DOI 10.5772/13839，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "ARC": {
    "key": "ARC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Adaptive robust control of SISO nonlinear systems in a semi-strict feedback form（1997），DOI 10.1016/s0005-1098(96)00222-1，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "RLS-Adaptive": {
    "key": "RLS-Adaptive",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Online Controller Tuning via FRIT and Recursive Least-Squares（2012），DOI 10.3182/20120328-3-it-3014.00013，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Nussbaum-Gain": {
    "key": "Nussbaum-Gain",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Some remarks on a conjecture in parameter adaptive control（1983），DOI 10.1016/0167-6911(83)90021-x，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Fuzzy": {
    "key": "Fuzzy",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Application of fuzzy algorithms for control of simple dynamic plant（1974），DOI 10.1049/piee.1974.0328，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Neural-RBF-ADRC": {
    "key": "Neural-RBF-ADRC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Active Disturbance Rejection Control of Multi-Joint Industrial Robots Based on Dynamic Feedforward（2019），DOI 10.3390/electronics8050591，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "MFAC": {
    "key": "MFAC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Data-Driven Model-Free Adaptive Control for a Class of MIMO Nonlinear Discrete-Time Systems（2011），DOI 10.1109/tnn.2011.2176141，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "U-Model": {
    "key": "U-Model",
    "status": "suspect",
    "reason": "两轮 Crossref 检索最佳相似度 0.57，未定位到精确记录；原始标注为 International Journal of Systems Science 55(15), 3120–3142 (2024)。需人工按期刊卷期核对，不判为虚假。",
    "checkedAt": "2026-11-14"
  },
  "ESC": {
    "key": "ESC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Performance improvement and limitations in extremum seeking control（2000），DOI 10.1016/s0167-6911(99)00111-5，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "BELBIC": {
    "key": "BELBIC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Introducing Belbic: Brain Emotional Learning Based Intelligent Controller（2004），DOI 10.1080/10798587.2004.10642862，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Linear-Actor-Critic": {
    "key": "Linear-Actor-Critic",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Neuronlike adaptive elements that can solve difficult learning control problems（1983），DOI 10.1109/tsmc.1983.6313077，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "CMAC-Cerebellar": {
    "key": "CMAC-Cerebellar",
    "status": "verified",
    "reason": "Crossref 权威题录命中：A New Approach to Manipulator Control: The Cerebellar Model Articulation Controller (CMAC)（1975），DOI 10.1115/1.3426922，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "SPSA-Optimizer": {
    "key": "SPSA-Optimizer",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Multivariate stochastic approximation using a simultaneous perturbation gradient approximation（1992），DOI 10.1109/9.119632，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "VRFT-DataDriven": {
    "key": "VRFT-DataDriven",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Virtual reference feedback tuning: a direct method for the design of feedback controllers（2002），DOI 10.1016/s0005-1098(02)00032-8，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "PPC": {
    "key": "PPC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Robust Adaptive Control of Feedback Linearizable MIMO Nonlinear Systems With Prescribed Performance（2008），DOI 10.1109/tac.2008.929402，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Funnel-Control": {
    "key": "Funnel-Control",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Tracking with prescribed transient behaviour（2002），DOI 10.1051/cocv:2002064，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "BLF": {
    "key": "BLF",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Barrier Lyapunov Functions for the control of output-constrained nonlinear systems（2009），DOI 10.1016/j.automatica.2008.11.017，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Tan-BLF": {
    "key": "Tan-BLF",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Tangent Barrier Lyapunov Functions for the Control of Output-Constrained Nonlinear Systems（2013），DOI 10.3182/20130902-3-cn-3020.00122，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "TimeVary-BLF": {
    "key": "TimeVary-BLF",
    "status": "verified",
    "reason": "Crossref 权威题录命中：A Survey on the Control Lyapunov Function and Control Barrier Function for Nonlinear-Affine Control Systems（2023），DOI 10.1109/jas.2023.123075，题名相似度 0.875。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Integral-BLF": {
    "key": "Integral-BLF",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Unified Barrier Function–Based Tracking Control of Strict-Feedback Nonlinear Systems with Asymmetric Time-Varying State Constraints（2026），DOI 10.1109/eei70303.2026.11640596，题名相似度 0.741。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "CBF-QP": {
    "key": "CBF-QP",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Control Barrier Function Based Quadratic Programs for Safety Critical Systems（2017），DOI 10.1109/tac.2016.2638961，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "CFTC": {
    "key": "CFTC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Continuous finite-time stabilization of the translational and rotational double integrators（1998），DOI 10.1109/9.668834，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "FxTC": {
    "key": "FxTC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Nonlinear Feedback Design for Fixed-Time Stabilization of Linear Control Systems（2012），DOI 10.1109/tac.2011.2179869，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "PTC": {
    "key": "PTC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Time-varying feedback for regulation of normal-form nonlinear systems in prescribed finite time（2017），DOI 10.1016/j.automatica.2017.06.008，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "InputShaping": {
    "key": "InputShaping",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Preshaping Command Inputs to Reduce System Vibration（1988），DOI 10.21236/ada208153，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Posicast": {
    "key": "Posicast",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Posicast Control of Damped Oscillatory Systems（1957），DOI 10.1109/jrproc.1957.278530，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "SmithPredict": {
    "key": "SmithPredict",
    "status": "suspect",
    "reason": "arXiv:2507.22243 真实存在，但作者与题名均错配：原文作者为 Anton Pyrkin, Konstantin Kalinin（2025-07-29），题名「Modified Smith predictor for unstable linear systems」；原始标注「A. V. Nekhoroshikh & I. B. Furtat (2025)」及「…with input delay」与原文不符。保留原始元数据，需按原文更正。",
    "checkedAt": "2026-11-14"
  },
  "Artstein-Reduction": {
    "key": "Artstein-Reduction",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Linear systems with delayed controls: A reduction（1982），DOI 10.1109/tac.1982.1103023，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "TDC": {
    "key": "TDC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：A Time Delay Controller for Systems With Unknown Dynamics（1990），DOI 10.1115/1.2894130，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "IMC": {
    "key": "IMC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Internal model control. A unifying review and some new results（1982），DOI 10.1021/i200017a016，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "ILC": {
    "key": "ILC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Bettering operation of Robots by learning（1984），DOI 10.1002/rob.4620010203，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Repetitive": {
    "key": "Repetitive",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Repetitive control system: a new type servo system for periodic exogenous signals（1988），DOI 10.1109/9.1274，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "GainSched": {
    "key": "GainSched",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Analysis of gain scheduled control for nonlinear plants（1990），DOI 10.1109/9.58498，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Switched": {
    "key": "Switched",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Dwell-time switching（2010），DOI 10.1016/j.sysconle.2009.11.007，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "DynPole": {
    "key": "DynPole",
    "status": "verified",
    "reason": "Crossref 权威题录命中：A Dynamic Pole Motion Approach for Control of Nonlinear Hybrid Soft Legs: A Preliminary Study（2022），DOI 10.3390/machines10100875，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "ETC": {
    "key": "ETC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Event-Triggered Real-Time Scheduling of Stabilizing Control Tasks（2007），DOI 10.1109/tac.2007.904277，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Event-Triggered-MPC": {
    "key": "Event-Triggered-MPC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Event-Triggered Disturbance Estimation and Output Feedback Control Design for Inner-Formation Systems（2024），DOI 10.3390/app14093656，题名相似度 0.952。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Quantized-Ctrl": {
    "key": "Quantized-Ctrl",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Quantized feedback stabilization of linear systems（2000），DOI 10.1109/9.867021，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Extended-Luenberger": {
    "key": "Extended-Luenberger",
    "status": "verified",
    "reason": "Crossref 权威题录命中：A Luenberger-like observer for nonlinear systems（1993），DOI 10.1080/00207179308934406，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "EKF-Ctrl": {
    "key": "EKF-Ctrl",
    "status": "verified",
    "reason": "Crossref 权威题录命中：A Generalized Extended Kalman Filter Implementation for the Robot Operating System（2015），DOI 10.1007/978-3-319-08338-4_25，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Particle-Filter": {
    "key": "Particle-Filter",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Novel approach to nonlinear/non-Gaussian Bayesian state estimation（1993），DOI 10.1049/ip-f-2.1993.0015，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "FO-PD": {
    "key": "FO-PD",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Tuning Fractional Order PI Controllers for Fractional Order Velocity Systems with Experimental Validation（2012），DOI 10.1002/9781118387726.ch3，题名相似度 0.667。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Nonlinear-Power-ADRC": {
    "key": "Nonlinear-Power-ADRC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：From PID to Active Disturbance Rejection Control（2009），DOI 10.1109/tie.2008.2011621，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Implicit-Euler-Ctrl": {
    "key": "Implicit-Euler-Ctrl",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Dynamical Systems Coupled with Monotone Set-Valued Operators: Formalisms, Applications, Well-Posedness, and Stability（2020），DOI 10.1137/18m1234795，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Lorenz-Coupled": {
    "key": "Lorenz-Coupled",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Deterministic Nonperiodic Flow（1963），DOI 10.1175/1520-0469(1963)020<0130:dnf>2.0.co;2，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Speed-Gradient": {
    "key": "Speed-Gradient",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Speed-Gradient Control of the Brockett Integrator（2016），DOI 10.1137/15m1013456，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "P-PI-Cascade": {
    "key": "P-PI-Cascade",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Cascade control for feed drive systems（2025），DOI 10.15625/0866-7136/22269，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Bilinear-Tustin-PID": {
    "key": "Bilinear-Tustin-PID",
    "status": "verified",
    "reason": "Crossref 权威题录命中：PID×(n-2) stage PD cascade controller for SISO systems，DOI 10.1109/sice.1998.742960，题名相似度 0.857。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Gain-Margin-PID": {
    "key": "Gain-Margin-PID",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Automatic tuning of simple regulators with specifications on phase and amplitude margins（1984），DOI 10.1016/0005-1098(84)90014-1，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "IMC-PID": {
    "key": "IMC-PID",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Internal model control: PID controller design（1986），DOI 10.1021/i200032a041，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "LQR-Servo-FF": {
    "key": "LQR-Servo-FF",
    "status": "verified",
    "reason": "Crossref 权威题录命中：A trajectory tracking LQR controller for a quadrotor: Design and experimental evaluation（2015），DOI 10.1109/tencon.2015.7372729，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Linear-Time-Optimal-Switch": {
    "key": "Linear-Time-Optimal-Switch",
    "status": "suspect",
    "reason": "两轮 Crossref 检索最佳相似度 0.52；PTOS 硬盘伺服相关文献存在，但所标题名未精确命中，需人工按 Applied Sciences 9(23):5201 核对。",
    "checkedAt": "2026-11-14"
  },
  "Petersen-GuaranteedCost": {
    "key": "Petersen-GuaranteedCost",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Optimal guaranteed cost control and filtering for uncertain linear systems（1994），DOI 10.1109/9.317138，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Passivity-Shortage-Comp": {
    "key": "Passivity-Shortage-Comp",
    "status": "suspect",
    "reason": "arXiv:2601.04796 真实存在、题名完全一致，但作者错配：原文为 Xi Ru, Xiaoyu Peng, Xinghua Chen, Zhaojian Wang, Peng Yang, Feng Liu（2026-01-08），原始标注「Z. Wang, F. Liu, & S. Mei」仅部分吻合且多出 S. Mei。属题名真、作者部分错配（嵌合引用线索），保留原始元数据，需按原文更正作者。",
    "checkedAt": "2026-11-14"
  },
  "MinMax-MPC": {
    "key": "MinMax-MPC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Min-max feedback model predictive control for constrained linear systems（1998），DOI 10.1109/9.704989，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Boundary-Layer-Varying-SMC": {
    "key": "Boundary-Layer-Varying-SMC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Composite adaptive control of robot manipulators（1989），DOI 10.1016/0005-1098(89)90094-0，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Global-SMC": {
    "key": "Global-SMC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：A Discrete‐Time Global Quasi‐Sliding Mode Control Scheme with Bounded External Disturbance Rejection（2013），DOI 10.1002/asjc.824，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "HOSM-Quasi-Continuous": {
    "key": "HOSM-Quasi-Continuous",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Consistent Discretization of Finite-Time and Fixed-Time Stable Systems（2019），DOI 10.1137/18m1197345，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Active-Force-Control": {
    "key": "Active-Force-Control",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Intelligent Adaptive Active Force Control of a Robotic Arm with Embedded Iterative Learning Algorithms（2012），DOI 10.11113/jt.v35.594，题名相似度 0.667。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Equivalent-Input-Disturbance": {
    "key": "Equivalent-Input-Disturbance",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Improving Disturbance-Rejection Performance Based on an Equivalent-Input-Disturbance Approach（2008），DOI 10.1109/tie.2007.905976，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Harmonic-Oscillator-PBC": {
    "key": "Harmonic-Oscillator-PBC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Interconnection and damping assignment passivity-based control of port-controlled Hamiltonian systems（2002），DOI 10.1016/s0005-1098(01)00278-3，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Flatness-Trajectory-Track": {
    "key": "Flatness-Trajectory-Track",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Flatness and defect of non-linear systems: introductory theory and examples（1995），DOI 10.1080/00207179508921959，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  },
  "Composite-MRAC": {
    "key": "Composite-MRAC",
    "status": "verified",
    "reason": "Crossref 权威题录命中：Composite adaptive control of robot manipulators（1989），DOI 10.1016/0005-1098(89)90094-0，题名相似度 1。注意：仅核验题录真实性，未做全文 locator 关联度审计。",
    "checkedAt": "2026-11-14"
  }
};
  const getPaper = (key) => citations[key] || null;
  const getVerify = (key) => verification[key] || { key: key, status: 'unverified' };
  NS.papers = { citations: citations, verification: verification, getPaper: getPaper, getVerify: getVerify,
    count: Object.keys(citations).length };
})(typeof window !== 'undefined' ? window : globalThis);
