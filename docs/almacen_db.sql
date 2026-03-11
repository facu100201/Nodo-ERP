--
-- PostgreSQL database dump (sin \restrict para uso como init en Docker)
--

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

-- Started on 2026-01-21 09:20:30

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
-- SET transaction_timeout = 0;  -- Comentado: parámetro no existe en PostgreSQL 15
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 244 (class 1255 OID 24809)
-- Name: fn_descuento_inventario(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_descuento_inventario() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    stock_actual INT;
BEGIN
    SELECT stock INTO stock_actual
    FROM inventario
    WHERE variante_id = NEW.variante_id
    FOR UPDATE;

    IF stock_actual IS NULL THEN
        RAISE EXCEPTION 'No existe inventario para la variante %', NEW.variante_id;
    END IF;

    IF stock_actual < NEW.cantidad THEN
        RAISE EXCEPTION 'Inventario insuficiente para la variante %', NEW.variante_id;
    END IF;

    UPDATE inventario
    SET stock = stock - NEW.cantidad,
        actualizado_en = NOW()
    WHERE variante_id = NEW.variante_id;

    INSERT INTO movimientos_inventario (
        variante_id, tipo, cantidad, referencia
    ) VALUES (
        NEW.variante_id,
        'SALIDA',
        NEW.cantidad,
        'Venta ID ' || NEW.venta_id
    );

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_descuento_inventario() OWNER TO postgres;

--
-- TOC entry 245 (class 1255 OID 24811)
-- Name: fn_precio_automatico(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_precio_automatico() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_precio NUMERIC(10,2);
BEGIN
    SELECT
        CASE
            WHEN NEW.cantidad >= 12 THEN precio_mayoreo
            ELSE precio_menudeo
        END
    INTO v_precio
    FROM variantes_producto
    WHERE id = NEW.variante_id;

    IF v_precio IS NULL THEN
        RAISE EXCEPTION
        'Precio no definido para variante_id %', NEW.variante_id;
    END IF;

    NEW.precio_unitario := v_precio;
    NEW.subtotal := v_precio * NEW.cantidad;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_precio_automatico() OWNER TO postgres;

--
-- TOC entry 246 (class 1255 OID 24815)
-- Name: fn_validar_stock(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_validar_stock() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_stock_actual INTEGER;
BEGIN
    -- Bloquea la fila de inventario
    SELECT stock
    INTO v_stock_actual
    FROM inventario
    WHERE variante_id = NEW.variante_id
    FOR UPDATE;

    IF v_stock_actual IS NULL THEN
        RAISE EXCEPTION 'No existe inventario para variante_id %', NEW.variante_id;
    END IF;

    IF v_stock_actual < NEW.cantidad THEN
        RAISE EXCEPTION
        'Stock insuficiente. Disponible: %, solicitado: %',
        v_stock_actual, NEW.cantidad;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_validar_stock() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 239 (class 1259 OID 24764)
-- Name: factura_ventas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.factura_ventas (
    factura_id integer NOT NULL,
    venta_id integer NOT NULL
);


ALTER TABLE public.factura_ventas OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 24755)
-- Name: facturas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.facturas (
    id integer NOT NULL,
    uuid_sat character varying(50),
    fecha timestamp without time zone,
    total numeric(12,2),
    rfc_emisor character varying(13) NOT NULL,
    rfc_receptor character varying(13),
    creada_en timestamp without time zone DEFAULT now()
);


ALTER TABLE public.facturas OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 24754)
-- Name: facturas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.facturas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.facturas_id_seq OWNER TO postgres;

--
-- TOC entry 5182 (class 0 OID 0)
-- Dependencies: 237
-- Name: facturas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.facturas_id_seq OWNED BY public.facturas.id;


--
-- TOC entry 241 (class 1259 OID 24782)
-- Name: folios_sat; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.folios_sat (
    id integer NOT NULL,
    serie character varying(10),
    folio_actual integer NOT NULL,
    activo boolean DEFAULT true
);


ALTER TABLE public.folios_sat OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 24781)
-- Name: folios_sat_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.folios_sat_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.folios_sat_id_seq OWNER TO postgres;

--
-- TOC entry 5183 (class 0 OID 0)
-- Dependencies: 240
-- Name: folios_sat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.folios_sat_id_seq OWNED BY public.folios_sat.id;


--
-- TOC entry 230 (class 1259 OID 24664)
-- Name: inventario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventario (
    id integer NOT NULL,
    variante_id integer NOT NULL,
    stock integer NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now(),
    CONSTRAINT inventario_stock_check CHECK ((stock >= 0))
);


ALTER TABLE public.inventario OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 24663)
-- Name: inventario_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventario_id_seq OWNER TO postgres;

--
-- TOC entry 5184 (class 0 OID 0)
-- Dependencies: 229
-- Name: inventario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventario_id_seq OWNED BY public.inventario.id;


--
-- TOC entry 232 (class 1259 OID 24683)
-- Name: movimientos_inventario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.movimientos_inventario (
    id integer NOT NULL,
    variante_id integer NOT NULL,
    tipo character varying(20) NOT NULL,
    cantidad integer NOT NULL,
    referencia text,
    creado_en timestamp without time zone DEFAULT now(),
    CONSTRAINT movimientos_inventario_cantidad_check CHECK ((cantidad > 0)),
    CONSTRAINT movimientos_inventario_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['ENTRADA'::character varying, 'SALIDA'::character varying, 'AJUSTE'::character varying])::text[])))
);


ALTER TABLE public.movimientos_inventario OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 24682)
-- Name: movimientos_inventario_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.movimientos_inventario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.movimientos_inventario_id_seq OWNER TO postgres;

--
-- TOC entry 5185 (class 0 OID 0)
-- Dependencies: 231
-- Name: movimientos_inventario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.movimientos_inventario_id_seq OWNED BY public.movimientos_inventario.id;


--
-- TOC entry 226 (class 1259 OID 24626)
-- Name: productos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.productos (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    activo boolean DEFAULT true,
    creado_en timestamp without time zone DEFAULT now(),
    producto character varying(150),
    sku character varying(50),
    talla character varying(20),
    color character varying(30),
    precio_menudeo numeric(10,2),
    precio_mayoreo numeric(10,2),
    codigo_barras character varying(100)
);


ALTER TABLE public.productos OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 24625)
-- Name: productos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.productos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.productos_id_seq OWNER TO postgres;

--
-- TOC entry 5186 (class 0 OID 0)
-- Dependencies: 225
-- Name: productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.productos_id_seq OWNED BY public.productos.id;


--
-- TOC entry 224 (class 1259 OID 24612)
-- Name: puntos_venta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.puntos_venta (
    id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    descripcion text,
    activo boolean DEFAULT true
);


ALTER TABLE public.puntos_venta OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 24611)
-- Name: puntos_venta_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.puntos_venta_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.puntos_venta_id_seq OWNER TO postgres;

--
-- TOC entry 5187 (class 0 OID 0)
-- Dependencies: 223
-- Name: puntos_venta_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.puntos_venta_id_seq OWNED BY public.puntos_venta.id;


--
-- TOC entry 220 (class 1259 OID 24578)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 24577)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- TOC entry 5188 (class 0 OID 0)
-- Dependencies: 219
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 243 (class 1259 OID 24792)
-- Name: tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tickets (
    id integer NOT NULL,
    venta_id integer NOT NULL,
    contenido text,
    creado_en timestamp without time zone DEFAULT now()
);


ALTER TABLE public.tickets OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 24791)
-- Name: tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tickets_id_seq OWNER TO postgres;

--
-- TOC entry 5189 (class 0 OID 0)
-- Dependencies: 242
-- Name: tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tickets_id_seq OWNED BY public.tickets.id;


--
-- TOC entry 222 (class 1259 OID 24589)
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash text NOT NULL,
    rol_id integer NOT NULL,
    activo boolean DEFAULT true,
    creado_en timestamp without time zone DEFAULT now()
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 24588)
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO postgres;

--
-- TOC entry 5190 (class 0 OID 0)
-- Dependencies: 221
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- TOC entry 228 (class 1259 OID 24639)
-- Name: variantes_producto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.variantes_producto (
    id integer NOT NULL,
    producto_id integer NOT NULL,
    sku character varying(50) NOT NULL,
    talla character varying(20),
    color character varying(30),
    precio_menudeo numeric(10,2) NOT NULL,
    precio_mayoreo numeric(10,2) NOT NULL,
    codigo_barras character varying(100) NOT NULL,
    activo boolean DEFAULT true,
    CONSTRAINT variantes_producto_precio_mayoreo_check CHECK ((precio_mayoreo >= (0)::numeric)),
    CONSTRAINT variantes_producto_precio_menudeo_check CHECK ((precio_menudeo >= (0)::numeric))
);


ALTER TABLE public.variantes_producto OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 24638)
-- Name: variantes_producto_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.variantes_producto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.variantes_producto_id_seq OWNER TO postgres;

--
-- TOC entry 5191 (class 0 OID 0)
-- Dependencies: 227
-- Name: variantes_producto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.variantes_producto_id_seq OWNED BY public.variantes_producto.id;


--
-- TOC entry 236 (class 1259 OID 24729)
-- Name: venta_detalle; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.venta_detalle (
    id integer NOT NULL,
    venta_id integer NOT NULL,
    variante_id integer NOT NULL,
    cantidad integer NOT NULL,
    precio_unitario numeric(10,2) NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    CONSTRAINT venta_detalle_cantidad_check CHECK ((cantidad > 0)),
    CONSTRAINT venta_detalle_precio_unitario_check CHECK ((precio_unitario >= (0)::numeric)),
    CONSTRAINT venta_detalle_subtotal_check CHECK ((subtotal >= (0)::numeric))
);


ALTER TABLE public.venta_detalle OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 24728)
-- Name: venta_detalle_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.venta_detalle_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.venta_detalle_id_seq OWNER TO postgres;

--
-- TOC entry 5192 (class 0 OID 0)
-- Dependencies: 235
-- Name: venta_detalle_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.venta_detalle_id_seq OWNED BY public.venta_detalle.id;


--
-- TOC entry 234 (class 1259 OID 24704)
-- Name: ventas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ventas (
    id integer NOT NULL,
    punto_venta_id integer NOT NULL,
    usuario_id integer NOT NULL,
    total numeric(12,2) NOT NULL,
    metodo_pago character varying(20) NOT NULL,
    creada_en timestamp without time zone DEFAULT now(),
    CONSTRAINT ventas_metodo_pago_check CHECK (((metodo_pago)::text = ANY ((ARRAY['EFECTIVO'::character varying, 'TARJETA'::character varying])::text[]))),
    CONSTRAINT ventas_total_check CHECK ((total >= (0)::numeric))
);


ALTER TABLE public.ventas OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 24703)
-- Name: ventas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ventas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ventas_id_seq OWNER TO postgres;

--
-- TOC entry 5193 (class 0 OID 0)
-- Dependencies: 233
-- Name: ventas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ventas_id_seq OWNED BY public.ventas.id;


--
-- TOC entry 4936 (class 2604 OID 24758)
-- Name: facturas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturas ALTER COLUMN id SET DEFAULT nextval('public.facturas_id_seq'::regclass);


--
-- TOC entry 4938 (class 2604 OID 24785)
-- Name: folios_sat id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folios_sat ALTER COLUMN id SET DEFAULT nextval('public.folios_sat_id_seq'::regclass);


--
-- TOC entry 4929 (class 2604 OID 24667)
-- Name: inventario id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario ALTER COLUMN id SET DEFAULT nextval('public.inventario_id_seq'::regclass);


--
-- TOC entry 4931 (class 2604 OID 24686)
-- Name: movimientos_inventario id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_inventario ALTER COLUMN id SET DEFAULT nextval('public.movimientos_inventario_id_seq'::regclass);


--
-- TOC entry 4924 (class 2604 OID 24629)
-- Name: productos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos ALTER COLUMN id SET DEFAULT nextval('public.productos_id_seq'::regclass);


--
-- TOC entry 4922 (class 2604 OID 24615)
-- Name: puntos_venta id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.puntos_venta ALTER COLUMN id SET DEFAULT nextval('public.puntos_venta_id_seq'::regclass);


--
-- TOC entry 4918 (class 2604 OID 24581)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 4940 (class 2604 OID 24795)
-- Name: tickets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets ALTER COLUMN id SET DEFAULT nextval('public.tickets_id_seq'::regclass);


--
-- TOC entry 4919 (class 2604 OID 24592)
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- TOC entry 4927 (class 2604 OID 24642)
-- Name: variantes_producto id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variantes_producto ALTER COLUMN id SET DEFAULT nextval('public.variantes_producto_id_seq'::regclass);


--
-- TOC entry 4935 (class 2604 OID 24732)
-- Name: venta_detalle id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venta_detalle ALTER COLUMN id SET DEFAULT nextval('public.venta_detalle_id_seq'::regclass);


--
-- TOC entry 4933 (class 2604 OID 24707)
-- Name: ventas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventas ALTER COLUMN id SET DEFAULT nextval('public.ventas_id_seq'::regclass);


--
-- TOC entry 5172 (class 0 OID 24764)
-- Dependencies: 239
-- Data for Name: factura_ventas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.factura_ventas (factura_id, venta_id) FROM stdin;
\.


--
-- TOC entry 5171 (class 0 OID 24755)
-- Dependencies: 238
-- Data for Name: facturas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.facturas (id, uuid_sat, fecha, total, rfc_emisor, rfc_receptor, creada_en) FROM stdin;
\.


--
-- TOC entry 5174 (class 0 OID 24782)
-- Dependencies: 241
-- Data for Name: folios_sat; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.folios_sat (id, serie, folio_actual, activo) FROM stdin;
\.


--
-- TOC entry 5163 (class 0 OID 24664)
-- Dependencies: 230
-- Data for Name: inventario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventario (id, variante_id, stock, actualizado_en) FROM stdin;
1	1	5	2026-01-13 23:26:55.694197
\.


--
-- TOC entry 5165 (class 0 OID 24683)
-- Dependencies: 232
-- Data for Name: movimientos_inventario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.movimientos_inventario (id, variante_id, tipo, cantidad, referencia, creado_en) FROM stdin;
\.


--
-- TOC entry 5159 (class 0 OID 24626)
-- Dependencies: 226
-- Data for Name: productos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.productos (id, nombre, descripcion, activo, creado_en, producto, sku, talla, color, precio_menudeo, precio_mayoreo, codigo_barras) FROM stdin;
1	Playera Básica	\N	t	2026-01-13 23:24:18.822453	\N	\N	\N	\N	\N	\N	\N
\.


--
-- TOC entry 5157 (class 0 OID 24612)
-- Dependencies: 224
-- Data for Name: puntos_venta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.puntos_venta (id, codigo, descripcion, activo) FROM stdin;
1	POS01	Caja principal almacén	t
\.


--
-- TOC entry 5153 (class 0 OID 24578)
-- Dependencies: 220
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, nombre) FROM stdin;
1	ADMIN
2	CAJERO
3	ALMACEN
\.


--
-- TOC entry 5176 (class 0 OID 24792)
-- Dependencies: 243
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tickets (id, venta_id, contenido, creado_en) FROM stdin;
\.


--
-- TOC entry 5155 (class 0 OID 24589)
-- Dependencies: 222
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

-- Usuarios por defecto: Admin/admin123, Cajero/cajero123
INSERT INTO public.usuarios (id, nombre, email, password_hash, rol_id, activo, creado_en) VALUES
(1, 'Admin', 'admin@local.com', '$2b$12$Jj8mMruVJxDrSNvgENaqku1VzzVWklaVvzWAVcXxw.QaqBTAHFp2a', 1, true, NOW()),
(2, 'Cajero', 'cajero@local.com', '$2b$12$jI0nXKXYaGJaSuo2nj8Zi.ArX/3Uaj1HevktS/oJSWkmKkxADho8i', 2, true, NOW());


--
-- TOC entry 5161 (class 0 OID 24639)
-- Dependencies: 228
-- Data for Name: variantes_producto; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.variantes_producto (id, producto_id, sku, talla, color, precio_menudeo, precio_mayoreo, codigo_barras, activo) FROM stdin;
1	1	PLY-BAS-M-NEG	M	Negro	600.00	500.00	7501234567890	t
\.


--
-- TOC entry 5169 (class 0 OID 24729)
-- Dependencies: 236
-- Data for Name: venta_detalle; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.venta_detalle (id, venta_id, variante_id, cantidad, precio_unitario, subtotal) FROM stdin;
\.


--
-- TOC entry 5167 (class 0 OID 24704)
-- Dependencies: 234
-- Data for Name: ventas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ventas (id, punto_venta_id, usuario_id, total, metodo_pago, creada_en) FROM stdin;
\.


--
-- TOC entry 5194 (class 0 OID 0)
-- Dependencies: 237
-- Name: facturas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.facturas_id_seq', 1, false);


--
-- TOC entry 5195 (class 0 OID 0)
-- Dependencies: 240
-- Name: folios_sat_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.folios_sat_id_seq', 1, false);


--
-- TOC entry 5196 (class 0 OID 0)
-- Dependencies: 229
-- Name: inventario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventario_id_seq', 1, true);


--
-- TOC entry 5197 (class 0 OID 0)
-- Dependencies: 231
-- Name: movimientos_inventario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.movimientos_inventario_id_seq', 1, false);


--
-- TOC entry 5198 (class 0 OID 0)
-- Dependencies: 225
-- Name: productos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.productos_id_seq', 1, true);


--
-- TOC entry 5199 (class 0 OID 0)
-- Dependencies: 223
-- Name: puntos_venta_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.puntos_venta_id_seq', 1, true);


--
-- TOC entry 5200 (class 0 OID 0)
-- Dependencies: 219
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 3, true);


--
-- TOC entry 5201 (class 0 OID 0)
-- Dependencies: 242
-- Name: tickets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tickets_id_seq', 1, false);


--
-- TOC entry 5202 (class 0 OID 0)
-- Dependencies: 221
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 2, true);


--
-- TOC entry 5203 (class 0 OID 0)
-- Dependencies: 227
-- Name: variantes_producto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.variantes_producto_id_seq', 1, true);


--
-- TOC entry 5204 (class 0 OID 0)
-- Dependencies: 235
-- Name: venta_detalle_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.venta_detalle_id_seq', 1, false);


--
-- TOC entry 5205 (class 0 OID 0)
-- Dependencies: 233
-- Name: ventas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ventas_id_seq', 1, false);


--
-- TOC entry 4986 (class 2606 OID 24770)
-- Name: factura_ventas factura_ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.factura_ventas
    ADD CONSTRAINT factura_ventas_pkey PRIMARY KEY (factura_id, venta_id);


--
-- TOC entry 4984 (class 2606 OID 24763)
-- Name: facturas facturas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_pkey PRIMARY KEY (id);


--
-- TOC entry 4988 (class 2606 OID 24790)
-- Name: folios_sat folios_sat_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folios_sat
    ADD CONSTRAINT folios_sat_pkey PRIMARY KEY (id);


--
-- TOC entry 4973 (class 2606 OID 24674)
-- Name: inventario inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_pkey PRIMARY KEY (id);


--
-- TOC entry 4975 (class 2606 OID 24676)
-- Name: inventario inventario_variante_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_variante_id_key UNIQUE (variante_id);


--
-- TOC entry 4977 (class 2606 OID 24697)
-- Name: movimientos_inventario movimientos_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_pkey PRIMARY KEY (id);


--
-- TOC entry 4965 (class 2606 OID 24637)
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- TOC entry 4961 (class 2606 OID 24624)
-- Name: puntos_venta puntos_venta_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.puntos_venta
    ADD CONSTRAINT puntos_venta_codigo_key UNIQUE (codigo);


--
-- TOC entry 4963 (class 2606 OID 24622)
-- Name: puntos_venta puntos_venta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.puntos_venta
    ADD CONSTRAINT puntos_venta_pkey PRIMARY KEY (id);


--
-- TOC entry 4953 (class 2606 OID 24587)
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- TOC entry 4955 (class 2606 OID 24585)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 4990 (class 2606 OID 24802)
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- TOC entry 4957 (class 2606 OID 24605)
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- TOC entry 4959 (class 2606 OID 24603)
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- TOC entry 4967 (class 2606 OID 24657)
-- Name: variantes_producto variantes_producto_codigo_barras_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variantes_producto
    ADD CONSTRAINT variantes_producto_codigo_barras_key UNIQUE (codigo_barras);


--
-- TOC entry 4969 (class 2606 OID 24653)
-- Name: variantes_producto variantes_producto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variantes_producto
    ADD CONSTRAINT variantes_producto_pkey PRIMARY KEY (id);


--
-- TOC entry 4971 (class 2606 OID 24655)
-- Name: variantes_producto variantes_producto_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variantes_producto
    ADD CONSTRAINT variantes_producto_sku_key UNIQUE (sku);


--
-- TOC entry 4982 (class 2606 OID 24743)
-- Name: venta_detalle venta_detalle_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venta_detalle
    ADD CONSTRAINT venta_detalle_pkey PRIMARY KEY (id);


--
-- TOC entry 4980 (class 2606 OID 24717)
-- Name: ventas ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_pkey PRIMARY KEY (id);


--
-- TOC entry 4978 (class 1259 OID 24808)
-- Name: idx_ventas_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ventas_fecha ON public.ventas USING btree (creada_en);


--
-- TOC entry 5002 (class 2620 OID 24814)
-- Name: venta_detalle trg_descuento_inventario; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_descuento_inventario AFTER INSERT ON public.venta_detalle FOR EACH ROW EXECUTE FUNCTION public.fn_descuento_inventario();


--
-- TOC entry 5003 (class 2620 OID 24813)
-- Name: venta_detalle trg_precio_automatico; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_precio_automatico BEFORE INSERT ON public.venta_detalle FOR EACH ROW EXECUTE FUNCTION public.fn_precio_automatico();


--
-- TOC entry 5004 (class 2620 OID 24816)
-- Name: venta_detalle trg_validar_stock; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_validar_stock BEFORE INSERT ON public.venta_detalle FOR EACH ROW EXECUTE FUNCTION public.fn_validar_stock();


--
-- TOC entry 4999 (class 2606 OID 24771)
-- Name: factura_ventas factura_ventas_factura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.factura_ventas
    ADD CONSTRAINT factura_ventas_factura_id_fkey FOREIGN KEY (factura_id) REFERENCES public.facturas(id) ON DELETE CASCADE;


--
-- TOC entry 5000 (class 2606 OID 24776)
-- Name: factura_ventas factura_ventas_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.factura_ventas
    ADD CONSTRAINT factura_ventas_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id) ON DELETE CASCADE;


--
-- TOC entry 4993 (class 2606 OID 24677)
-- Name: inventario inventario_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.variantes_producto(id);


--
-- TOC entry 4994 (class 2606 OID 24698)
-- Name: movimientos_inventario movimientos_inventario_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.variantes_producto(id);


--
-- TOC entry 5001 (class 2606 OID 24803)
-- Name: tickets tickets_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id);


--
-- TOC entry 4991 (class 2606 OID 24606)
-- Name: usuarios usuarios_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id);


--
-- TOC entry 4992 (class 2606 OID 24658)
-- Name: variantes_producto variantes_producto_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variantes_producto
    ADD CONSTRAINT variantes_producto_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- TOC entry 4997 (class 2606 OID 24749)
-- Name: venta_detalle venta_detalle_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venta_detalle
    ADD CONSTRAINT venta_detalle_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.variantes_producto(id);


--
-- TOC entry 4998 (class 2606 OID 24744)
-- Name: venta_detalle venta_detalle_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venta_detalle
    ADD CONSTRAINT venta_detalle_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id) ON DELETE CASCADE;


--
-- TOC entry 4995 (class 2606 OID 24718)
-- Name: ventas ventas_punto_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_punto_venta_id_fkey FOREIGN KEY (punto_venta_id) REFERENCES public.puntos_venta(id);


--
-- TOC entry 4996 (class 2606 OID 24723)
-- Name: ventas ventas_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


-- Completed on 2026-01-21 09:20:31

--
-- PostgreSQL database dump complete
--

